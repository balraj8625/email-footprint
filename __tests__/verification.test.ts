import { POST as sendVerification } from "@/app/api/send-verification/route";
import { POST as verifyCode } from "@/app/api/verify-code/route";
import { otpStore, OTP_CONFIG } from "@/lib/otp-store";

function createMockRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe("Email Verification API (Stage 2A)", () => {
  beforeEach(async () => {
    await otpStore.clear();
    jest.restoreAllMocks();
  });

  describe("POST /api/send-verification", () => {
    it("rejects missing or invalid email", async () => {
      const resMissing = await sendVerification(createMockRequest({}));
      expect(resMissing.status).toBe(400);
      const jsonMissing = await resMissing.json();
      expect(jsonMissing.error).toBe("invalid_email");

      const resInvalid = await sendVerification(createMockRequest({ email: "invalid-email" }));
      expect(resInvalid.status).toBe(400);
      const jsonInvalid = await resInvalid.json();
      expect(jsonInvalid.error).toBe("invalid_email");
    });

    it("generates 6-digit numeric OTP and stores it server-side without returning it in response", async () => {
      const res = await sendVerification(createMockRequest({ email: "user@example.com" }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.code).toBeUndefined(); // Never expose OTP in response

      const stored = await otpStore.get("user@example.com");
      expect(stored).not.toBeNull();
      expect(stored?.code).toMatch(/^\d{6}$/); // Exactly 6 digits
      expect(stored?.attempts).toBe(0);
      expect(stored?.expiresAt).toBeGreaterThan(Date.now());
    });

    it("enforces resend rate limiting cooldown", async () => {
      // First request succeeds
      const res1 = await sendVerification(createMockRequest({ email: "user@example.com" }));
      expect(res1.status).toBe(200);

      // Immediate second request is rate limited
      const res2 = await sendVerification(createMockRequest({ email: "user@example.com" }));
      expect(res2.status).toBe(429);
      const json2 = await res2.json();
      expect(json2.error).toBe("rate_limited");
      expect(json2.retry_after).toBeGreaterThan(0);
    });
  });

  describe("POST /api/verify-code", () => {
    it("rejects missing fields, invalid email, or invalid OTP format", async () => {
      const resMissing = await verifyCode(createMockRequest({ email: "user@example.com" }));
      expect(resMissing.status).toBe(400);
      const jsonMissing = await resMissing.json();
      expect(jsonMissing.error).toBe("missing_fields");

      const resInvalidEmail = await verifyCode(createMockRequest({ email: "notanemail", code: "123456" }));
      expect(resInvalidEmail.status).toBe(400);
      const jsonInvalidEmail = await resInvalidEmail.json();
      expect(jsonInvalidEmail.error).toBe("invalid_email");

      const resInvalidFormat = await verifyCode(createMockRequest({ email: "user@example.com", code: "abc" }));
      expect(resInvalidFormat.status).toBe(400);
      const jsonInvalidFormat = await resInvalidFormat.json();
      expect(jsonInvalidFormat.error).toBe("invalid_format");
    });

    it("verifies valid OTP successfully and invalidates OTP after success", async () => {
      // Setup OTP
      await sendVerification(createMockRequest({ email: "test@example.com" }));
      const stored = await otpStore.get("test@example.com");
      expect(stored).not.toBeNull();
      const code = stored!.code;

      // Verify with correct code
      const res = await verifyCode(createMockRequest({ email: "test@example.com", code }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.details_available).toBe(true);
      expect(Array.isArray(json.accounts)).toBe(true);

      // OTP must be invalidated after success
      const storedAfter = await otpStore.get("test@example.com");
      expect(storedAfter).toBeNull();

      // Re-verifying same code fails
      const resRetry = await verifyCode(createMockRequest({ email: "test@example.com", code }));
      expect(resRetry.status).toBe(400);
      const jsonRetry = await resRetry.json();
      expect(jsonRetry.error).toBe("otp_not_found");
    });

    it("rejects invalid OTP and decrements remaining attempts", async () => {
      await sendVerification(createMockRequest({ email: "test@example.com" }));

      const res = await verifyCode(createMockRequest({ email: "test@example.com", code: "000000" }));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("invalid_code");
      expect(json.message).toContain("4 attempts remaining");

      const stored = await otpStore.get("test@example.com");
      expect(stored?.attempts).toBe(1);
    });

    it("rejects expired OTP", async () => {
      const now = Date.now();
      await otpStore.set("expired@example.com", {
        code: "654321",
        expiresAt: now - 1000, // Expired 1 second ago
        attempts: 0,
        lastSentAt: now - OTP_CONFIG.EXPIRATION_MS,
      });

      const res = await verifyCode(createMockRequest({ email: "expired@example.com", code: "654321" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("otp_expired");

      // Expired entry should be cleaned up
      expect(await otpStore.get("expired@example.com")).toBeNull();
    });

    it("enforces maximum failed attempts and invalidates OTP", async () => {
      await sendVerification(createMockRequest({ email: "test@example.com" }));

      // Fail 4 times (attempts 1 to 4)
      for (let i = 0; i < 4; i++) {
        const res = await verifyCode(createMockRequest({ email: "test@example.com", code: "000000" }));
        expect(res.status).toBe(401);
      }

      // 5th failed attempt reaches MAX_ATTEMPTS and returns 429
      const res5 = await verifyCode(createMockRequest({ email: "test@example.com", code: "000000" }));
      expect(res5.status).toBe(429);
      const json5 = await res5.json();
      expect(json5.error).toBe("max_attempts_exceeded");

      // Stored OTP must be completely deleted/invalidated
      const stored = await otpStore.get("test@example.com");
      expect(stored).toBeNull();
    });
  });
});
