import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const masked =
    user.length <= 2
      ? user[0] + "*".repeat(user.length - 1)
      : user[0] + "*".repeat(user.length - 2) + user[user.length - 1];
  return `${masked}@${domain}`;
}

export function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    social: "👤",
    ecommerce: "🛍️",
    forums: "💬",
    gaming: "🎮",
    finance: "💳",
    travel: "✈️",
    productivity: "📋",
    streaming: "🎬",
    health: "🏥",
    other: "🔗",
  };
  return map[category.toLowerCase()] ?? "🔗";
}

export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    social: "Social Media",
    ecommerce: "E-Commerce",
    forums: "Forums & Communities",
    gaming: "Gaming",
    finance: "Finance",
    travel: "Travel",
    productivity: "Productivity",
    streaming: "Streaming",
    health: "Health",
    other: "Other",
  };
  return map[category.toLowerCase()] ?? category;
}

export function categorizeBreachName(name: string): string {
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

export function getSiteUrl(name: string): string {
  const n = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

  return knownUrls[n] ?? `https://www.google.com/search?q=${encodeURIComponent(name + " breach details")}`;
}

export function getCategoryRecommendation(category: string): string {
  const map: Record<string, string> = {
    social: "Enable 2FA and review linked third-party app permissions on social accounts.",
    ecommerce: "Check saved payment cards and audit recent order activity on shopping sites.",
    finance: "Update banking/crypto credentials immediately and verify account alerts.",
    forums: "Ensure you don't reuse forum passwords across sensitive personal services.",
    gaming: "Verify authenticator apps and protect linked virtual assets/wallets.",
    productivity: "Rotate workplace or collaboration passwords and review SSO authorizations.",
    streaming: "Log out all inactive devices and refresh master subscription passwords.",
    travel: "Review saved identity documents, loyalty numbers, and payment profiles.",
    health: "Ensure portal access requires multi-factor authentication.",
    other: "Audit services where this email was used and update old or reused passwords.",
  };
  return map[category.toLowerCase()] ?? "Update passwords and ensure multi-factor authentication is enabled.";
}

const SESSION_KEY = "ef_session";
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

interface SessionData {
  email: string;
  lookup?: unknown;
  verified?: boolean;
  accounts?: unknown[];
  ts: number;
}

export function saveSession(data: Partial<SessionData>) {
  if (typeof window === "undefined") return;
  const existing = loadSession();
  const merged: SessionData = {
    ...existing,
    ...data,
    email: data.email ?? existing?.email ?? "",
    ts: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
}

export function loadSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: SessionData = JSON.parse(raw);
    if (Date.now() - data.ts > SESSION_TTL) {
      clearSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
