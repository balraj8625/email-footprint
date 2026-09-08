import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/utils";
import { verifyOtp } from "@/lib/otpStore";
import type { Account } from "@/lib/types";

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

function getSiteUrl(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const knownUrls: Record<string, string> = {
    linkedin: "https://www.linkedin.com",
    twitter: "https://x.com",
    twitterscraped: "https://x.com",
    adobe: "https://www.adobe.com",
    kickstarter: "https://www.kickstarter.com",
    dropbox: "https://www.dropbox.com",
    canva: "https://www.canva.com",
    trello: "https://trello.com",
    discord: "https://discord.com",
    duolingo: "https://www.duolingo.com",
    myspace: "https://myspace.com",
    lastfm: "https://www.last.fm",
    disqus: "https://disqus.com",
    chegg: "https://www.chegg.com",
    wattpad: "https://www.wattpad.com",
    parkmobile: "https://parkmobile.io",
    soundcloud: "https://soundcloud.com",
    vk: "https://vk.com",
    yahoo: "https://login.yahoo.com",
  };

  return knownUrls[n] ?? `https://www.google.com/search?q=${encodeURIComponent(name)}`;
}

function getActionNotes(category: string, siteName: string): string {
  switch (category) {
    case "social":
      return `Review connected apps and enable two-factor authentication on ${siteName}.`;
    case "ecommerce":
      return `Check your transaction history for unauthorized orders on ${siteName} and update passwords.`;
    case "finance":
      return `Immediately update passwords, check recent transactions, and activate multi-factor authentication.`;
    case "productivity":
      return `Rotate your account password and review authorized third-party OAuth access tokens.`;
    case "gaming":
      return `Enable 2FA/authenticator app and ensure unique credentials for your gaming account.`;
    case "forums":
      return `Change password and verify email notifications are enabled for unexpected logins.`;
    case "streaming":
      return `Check authorized devices and change your streaming subscription password.`;
    case "travel":
      return `Verify registered payment cards and saved contact info on ${siteName}.`;
    default:
      return `Rotate your password on ${siteName} and ensure it is not reused on other services.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "missing_fields", message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "invalid_email", message: "A valid email is required." },
        { status: 400 }
      );
    }

    // Verify OTP against server-side store
    const verification = verifyOtp(normalizedEmail, String(code));
    if (!verification.success) {
      if (verification.reason === "expired") {
        return NextResponse.json(
          { error: "code_expired", message: "Verification code has expired. Please request a new code." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "invalid_code", message: "That code is incorrect or expired. Please try again." },
        { status: 401 }
      );
    }

    // Fetch real breach data from XposedOrNot
    const breachUrl = `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(normalizedEmail)}`;
    let accounts: Account[] = [];

    try {
      const res = await fetch(breachUrl, {
        headers: { "user-agent": "EmailFootprint-App/1.0" },
      });

      if (res.ok) {
        const data = await res.json();
        const breachList: string[] = Array.isArray(data.breaches?.[0]) ? data.breaches[0] : [];

        // Deduplicate breach names
        const seen = new Set<string>();
        for (const breachName of breachList) {
          const trimmed = breachName.trim();
          const lower = trimmed.toLowerCase();
          if (!trimmed || seen.has(lower)) continue;
          seen.add(lower);

          const category = categorizeBreachName(trimmed);
          accounts.push({
            site: trimmed,
            siteUrl: getSiteUrl(trimmed),
            logo: `/logos/${encodeURIComponent(lower)}.svg`,
            discoverySource: `Public Breach — ${trimmed}`,
            confidence: "verified",
            category,
            notes: getActionNotes(category, trimmed),
          });
        }
      }
    } catch (fetchErr) {
      console.error("Failed to query breach details from XposedOrNot:", fetchErr);
    }

    return NextResponse.json({
      status: "ok",
      details_available: true,
      accounts,
    });
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid request body." },
      { status: 400 }
    );
  }
}

