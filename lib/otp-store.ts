import crypto from "crypto";

export interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

export interface OtpStore {
  get(email: string): Promise<StoredOtp | null>;
  set(email: string, otp: StoredOtp): Promise<void>;
  delete(email: string): Promise<void>;
}

/**
 * In-memory process-local OTP storage.
 *
 * NOTE: This implementation is for local development and single-instance environments only.
 * In a distributed, serverless, or multi-instance production deployment, replace this with
 * a shared store such as Redis or a persistent key-value store to ensure OTP state is shared
 * across server instances.
 */
class MemoryOtpStore implements OtpStore {
  private store = new Map<string, StoredOtp>();

  async get(email: string): Promise<StoredOtp | null> {
    const entry = this.store.get(email);
    if (!entry) return null;
    return entry;
  }

  async set(email: string, otp: StoredOtp): Promise<void> {
    this.store.set(email, otp);
  }

  async delete(email: string): Promise<void> {
    this.store.delete(email);
  }

  /**
   * Helper for testing/cleanup
   */
  async clear(): Promise<void> {
    this.store.clear();
  }
}

// Global instance to maintain state across hot reloads in development
const globalForOtp = globalThis as unknown as { otpStore?: MemoryOtpStore };
export const otpStore: MemoryOtpStore = globalForOtp.otpStore ?? new MemoryOtpStore();
if (process.env.NODE_ENV !== "production") {
  globalForOtp.otpStore = otpStore;
}

export const OTP_CONFIG = {
  EXPIRATION_MS: 10 * 60 * 1000, // 10 minutes
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_MS: 30 * 1000, // 30 seconds
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateSecureOtp(): string {
  // Generate a random integer between 0 and 999999 inclusive
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, "0");
}
