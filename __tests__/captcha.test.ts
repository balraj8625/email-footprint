import { verifyCaptchaToken } from "@/lib/captcha";

describe("verifyCaptchaToken", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // @ts-expect-error mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("fails when token is empty or missing", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const res = await verifyCaptchaToken("");
    expect(res.success).toBe(false);
    expect(res.error).toBe("captcha_required");

    const resNull = await verifyCaptchaToken(undefined);
    expect(resNull.success).toBe(false);
    expect(resNull.error).toBe("captcha_required");
  });

  it("passes dev/test tokens when secret key is not set", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;

    const res = await verifyCaptchaToken("dev_sample_token_123");
    expect(res.success).toBe(true);
  });

  it("verifies successfully with Cloudflare Turnstile when secret key is provided", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test_secret_key";

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const res = await verifyCaptchaToken("valid_turnstile_token", "1.2.3.4");
    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("fails closed in production when secret key is not configured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;
    // @ts-expect-error override NODE_ENV for test
    process.env.NODE_ENV = "production";

    const res = await verifyCaptchaToken("some_token");
    expect(res.success).toBe(false);
    expect(res.error).toBe("captcha_config_missing");
  });
});


