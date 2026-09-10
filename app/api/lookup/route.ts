import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/utils";
import { verifyCaptchaToken } from "@/lib/captcha";
import { checkRateLimit } from "@/lib/rateLimit";

function categorizeBreachName(name: string): string {
  const n = (name || "").toLowerCase();

  if (
    /linkedin|facebook|twitter|instagram|myspace|snapchat|tiktok|reddit|tumblr|pinterest|vk|discord/.test(
      n
    )
  ) {
    return "social";
  }
  if (
    /amazon|ebay|shopify|alibaba|target|walmart|poshmark|etsy|zappos|shop|store/.test(
      n
    )
  ) {
    return "ecommerce";
  }
  if (
    /steam|twitch|roblox|epicgames|playstation|xbox|zynga|neopets|nintendo|blizzard|game/.test(
      n
    )
  ) {
    return "gaming";
  }
  if (
    /paypal|cointracker|robinhood|mint|mastercard|crypto|equity|bank|finance/.test(
      n
    )
  ) {
    return "finance";
  }
  if (
    /adobe|dropbox|canva|evernote|slack|trello|asana|notion|zoom/.test(
      n
    )
  ) {
    return "productivity";
  }
  if (
    /disqus|vbulletin|phpbb|forum|community|xenforo/.test(
      n
    )
  ) {
    return "forums";
  }
  if (/netflix|hulu|spotify|deezer|lastfm|soundcloud|movie|stream/.test(n)) {
    return "streaming";
  }
  if (/uber|lyft|airbnb|tripadvisor|hotel|travel|flight/.test(n)) {
    return "travel";
  }
  return "other";
}

interface XposedOrNotSuccess {
  status?: string;
  breaches?: string[][];
  email?: string;
  Error?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get("email");
  const captchaToken = searchParams.get("captcha_token") || request.headers.get("x-captcha-token");

  // 1. IP Rate limit check for abuse protection
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";

  const rateCheck = checkRateLimit(clientIp, {
    maxRequests: 15,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Too many searches from your device. Please try again in ${Math.ceil(rateCheck.resetSeconds / 60)} minute(s).`,
        retry_after: rateCheck.resetSeconds,
      },
      { status: 429 }
    );
  }

  // 2. Email format validation
  if (!rawEmail) {
    return NextResponse.json(
      { error: "invalid_email", message: "Please provide an email address." },
      { status: 400 }
    );
  }

  const email = rawEmail.trim().toLowerCase();

  if (!validateEmail(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  // 3. Server-side CAPTCHA token verification
  const captchaResult = await verifyCaptchaToken(captchaToken, clientIp);
  if (!captchaResult.success) {
    if (captchaResult.error === "captcha_required") {
      return NextResponse.json(
        {
          error: "captcha_required",
          message: "Security verification required. Please complete the CAPTCHA before searching.",
        },
        { status: 400 }
      );
    }
    if (captchaResult.error === "captcha_timeout") {
      return NextResponse.json(
        {
          error: "captcha_timeout",
          message: "Security verification timed out. Please try checking the CAPTCHA again.",
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error: "captcha_failed",
        message: "Security verification failed. Please check the CAPTCHA and try again.",
      },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);


  try {
    const url = `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(
      email
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "EmailFootprint-App/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 404) {
      return NextResponse.json({
        email,
        summary: {
          sources_checked: 1,
          breach_count: 0,
          possible_accounts: 0,
        },
        hints: [],
        details_available: false,
      });
    }

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 300;
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Too many requests — please try again later.",
          retry_after: isNaN(retryAfter) ? 300 : retryAfter,
        },
        { status: 429 }
      );
    }

    if (res.status === 400) {
      return NextResponse.json(
        {
          error: "invalid_email",
          message: "The requested email address is invalid.",
        },
        { status: 400 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "lookup_error",
          message: "Breach lookup service returned an error. Please try again later.",
        },
        { status: 502 }
      );
    }

    const data: XposedOrNotSuccess = await res.json();

    if (data.Error && data.Error.toLowerCase().includes("not found")) {
      return NextResponse.json({
        email,
        summary: {
          sources_checked: 1,
          breach_count: 0,
          possible_accounts: 0,
        },
        hints: [],
        details_available: false,
      });
    }

    const breachList: string[] = Array.isArray(data.breaches?.[0])
      ? data.breaches[0]
      : [];

    const categoryMap: Record<string, number> = {};
    for (const breachName of breachList) {
      const cat = categorizeBreachName(breachName);
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }

    const hints = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
    }));

    const uniqueServices = new Set(
      breachList.map((name) => name.toLowerCase().trim()).filter(Boolean)
    ).size;

    return NextResponse.json({
      email,
      summary: {
        sources_checked: 1,
        breach_count: breachList.length,
        possible_accounts: uniqueServices,
      },
      hints,
      details_available: false,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        {
          error: "timeout",
          message: "Request to breach lookup service timed out. Please try again.",
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error: "network_error",
        message: "Failed to connect to breach lookup service. Please try again.",
      },
      { status: 502 }
    );
  }
}
