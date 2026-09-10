export interface CaptchaVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Verify CAPTCHA token server-side.
 * Default provider: Cloudflare Turnstile (https://challenges.cloudflare.com/turnstile/v0/siteverify)
 * Also supports Google reCAPTCHA v2 / custom secret keys.
 */
export async function verifyCaptchaToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<CaptchaVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;

  // If secret key is not configured, we require a non-empty token in dev/test, but fail-closed in production
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "captcha_config_missing" };
    }
    if (!token || token.trim() === "") {
      return { success: false, error: "captcha_required" };
    }
    return { success: true };
  }



  // If secret key is configured, token is strictly required
  if (!token || token.trim() === "") {
    return { success: false, error: "captcha_required" };
  }

  // Cloudflare Turnstile always-pass test token for local test suites
  if (token === "XXXX.DUMMY.TOKEN.XXXX" && process.env.NODE_ENV !== "production") {
    return { success: true };
  }

  try {
    const endpoint = process.env.RECAPTCHA_SECRET_KEY
      ? "https://www.google.com/recaptcha/api/siteverify"
      : "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, error: "captcha_provider_error" };
    }

    const data = await res.json();

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: "captcha_failed",
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "captcha_timeout" };
    }
    return { success: false, error: "captcha_verification_error" };
  }
}

