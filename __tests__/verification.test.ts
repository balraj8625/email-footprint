import { POST as sendVerification } from "@/app/api/send-verification/route";
import { POST as verifyCode } from "@/app/api/verify-code/route";
import { clearOtpStore, saveOtp, OTP_TTL_MS } from "@/lib/otpStore";
import { NextRequest } from "next/server";

function createMockPostRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe("Ownership Verification & Details Flow", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    clearOtpStore();
    jest.resetModules();
    process.env = { ...originalEnv };
    // @ts-expect-error mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("POST /api/send-verification", () => {
    it("returns 400 for invalid or missing email", async () => {
      const resMissing = await sendVerification(createMockPostRequest({}));
      expect(resMissing.status).toBe(400);

      const resInvalid = await sendVerification(createMockPostRequest({ email: "invalid-email" }));
      expect(resInvalid.status).toBe(400);
    });

    it("generates and stores an OTP and returns 200 in development fallback", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.RESEND_API_KEY;

      const res = await sendVerification(createMockPostRequest({ email: "user@example.com" }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.dev_code).toMatch(/^\d{6}$/);
    });

    it("does not expose dev_code in production mode", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.RESEND_API_KEY;

      const res = await sendVerification(createMockPostRequest({ email: "user@example.com" }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.dev_code).toBeUndefined();
    });

    it("calls Resend when RESEND_API_KEY is provided", async () => {
      process.env.RESEND_API_KEY = "re_123456";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "email_123" }),
      });

      const res = await sendVerification(createMockPostRequest({ email: "resend-user@example.com" }));
      expect(res.status).toBe(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer re_123456",
          }),
        })
      );
    });
  });

  describe("POST /api/verify-code", () => {
    it("returns 400 when email or code is missing", async () => {
      const res1 = await verifyCode(createMockPostRequest({ email: "user@example.com" }));
      expect(res1.status).toBe(400);

      const res2 = await verifyCode(createMockPostRequest({ code: "123456" }));
      expect(res2.status).toBe(400);
    });

    it("returns 401 for wrong OTP", async () => {
      saveOtp("user@example.com", "987654");

      const res = await verifyCode(
        createMockPostRequest({ email: "user@example.com", code: "000000" })
      );
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe("invalid_code");
    });

    it("returns 401 for expired OTP", async () => {
      // Store an OTP that expired 1 second ago
      saveOtp("user@example.com", "987654", -1000);

      const res = await verifyCode(
        createMockPostRequest({ email: "user@example.com", code: "987654" })
      );
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe("code_expired");
    });

    it("returns 401 when no OTP was ever requested (missing OTP)", async () => {
      const res = await verifyCode(
        createMockPostRequest({ email: "never-requested@example.com", code: "123456" })
      );
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe("invalid_code");
    });

    it("successfully verifies valid OTP, consumes it, and maps real XposedOrNot breaches to Accounts", async () => {
      saveOtp("user@example.com", "654321");

      const mockXposed = {
        status: "success",
        breaches: [["LinkedIn", "Adobe", "Twitter"]],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockXposed,
      });

      const res = await verifyCode(
        createMockPostRequest({ email: "user@example.com", code: "654321" })
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.details_available).toBe(true);
      expect(json.accounts).toHaveLength(3);

      const linkedIn = json.accounts.find((a: { site: string }) => a.site === "LinkedIn");
      expect(linkedIn).toBeDefined();
      expect(linkedIn.category).toBe("social");
      expect(linkedIn.confidence).toBe("verified");
      expect(linkedIn.siteUrl).toBe("https://www.linkedin.com");
      expect(linkedIn.discoverySource).toBe("Public Breach — LinkedIn");

      // Verify OTP is consumed (cannot be used again)
      const resReuse = await verifyCode(
        createMockPostRequest({ email: "user@example.com", code: "654321" })
      );
      expect(resReuse.status).toBe(401);
    });
  });
});
