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
