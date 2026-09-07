import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/utils";

interface HibpBreach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
  IsRetired: boolean;
  IsSpamList: boolean;
  IsMalware: boolean;
}

function categorizeBreach(breach: HibpBreach): string {
  const domain = (breach.Domain || "").toLowerCase();
  const name = (breach.Name || "").toLowerCase();

  if (
    /linkedin|facebook|twitter|instagram|myspace|snapchat|tiktok|reddit|tumblr|pinterest|vk|discord/.test(
      domain || name
    )
  ) {
    return "social";
  }
  if (
    /amazon|ebay|shopify|alibaba|target|walmart|poshmark|etsy|zappos|shop|store/.test(
      domain || name
    )
  ) {
    return "ecommerce";
  }
  if (
    /steam|twitch|roblox|epicgames|playstation|xbox|zynga|neopets|nintendo|blizzard|game/.test(
      domain || name
    )
  ) {
    return "gaming";
  }
  if (
    /paypal|cointracker|robinhood|mint|mastercard|crypto|equity|bank|finance/.test(
      domain || name
    )
  ) {
    return "finance";
  }
  if (
    /adobe|dropbox|canva|evernote|slack|trello|asana|notion|zoom/.test(
      domain || name
    )
  ) {
    return "productivity";
  }
  if (
    /disqus|vbulletin|phpbb|forum|community|xenforo/.test(
      domain || name
    )
  ) {
    return "forums";
  }
  if (/netflix|hulu|spotify|deezer|lastfm|soundcloud|movie|stream/.test(domain || name)) {
    return "streaming";
  }
  if (/uber|lyft|airbnb|tripadvisor|hotel|travel|flight/.test(domain || name)) {
    return "travel";
  }
  return "other";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get("email");

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

  const apiKey = process.env.HIBP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "api_key_missing",
        message: "Server configuration error: HIBP_API_KEY is not set.",
      },
      { status: 500 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(
      email
    )}?truncateResponse=false`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "hibp-api-key": apiKey,
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

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        {
          error: "auth_error",
          message: "Authentication error with HIBP API. Please check server configuration.",
        },
        { status: 500 }
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
          error: "hibp_error",
          message: "Have I Been Pwned service returned an error. Please try again later.",
        },
        { status: 502 }
      );
    }

    const breaches: HibpBreach[] = await res.json();

    const categoryMap: Record<string, number> = {};
    for (const breach of breaches) {
      const cat = categorizeBreach(breach);
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }

    const hints = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
    }));

    const uniqueServices = new Set(
      breaches.map((b) => (b.Domain || b.Name || "").toLowerCase()).filter(Boolean)
    ).size;

    return NextResponse.json({
      email,
      summary: {
        sources_checked: 1,
        breach_count: breaches.length,
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
          message: "Request to Have I Been Pwned timed out. Please try again.",
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error: "network_error",
        message: "Failed to connect to Have I Been Pwned. Please try again.",
      },
      { status: 502 }
    );
  }
}
