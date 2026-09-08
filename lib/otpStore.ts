import crypto from "crypto";

interface StoredOtp {
  otp: string;
  expiresAt: number;
}

// In-memory OTP storage keyed by normalized email
// Using globalThis ensures the store persists across Next.js API route invocations in development
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, StoredOtp>;
};

const store: Map<string, StoredOtp> = globalForOtp.otpStore ?? new Map<string, StoredOtp>();
if (!globalForOtp.otpStore) {
  globalForOtp.otpStore = store;
}

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateOtp(): string {
  // Cryptographically secure 6-digit number (100000 - 999999)
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

export function saveOtp(email: string, otp: string, ttlMs: number = OTP_TTL_MS): void {
  const normalizedEmail = email.trim().toLowerCase();
  store.set(normalizedEmail, {
    otp,
    expiresAt: Date.now() + ttlMs,
  });
}

export type VerifyOtpResult =
  | { success: true }
  | { success: false; reason: "missing" | "invalid" | "expired" };

export function verifyOtp(email: string, submittedCode: string): VerifyOtpResult {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = store.get(normalizedEmail);

  if (!entry) {
    return { success: false, reason: "missing" };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(normalizedEmail);
    return { success: false, reason: "expired" };
  }

  if (entry.otp !== submittedCode.trim()) {
    return { success: false, reason: "invalid" };
  }

  // Consume OTP once successfully verified (one-time use)
  store.delete(normalizedEmail);
  return { success: true };
}

export function clearOtpStore(): void {
  store.clear();
}
