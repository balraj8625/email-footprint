import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/utils";
import { otpStore, OTP_CONFIG } from "@/lib/otp-store";

const MOCK_ACCOUNTS = [
  {
    site: "LinkedIn",
    siteUrl: "https://www.linkedin.com",
    logo: "/logos/linkedin.svg",
    discoverySource: "Breach — LinkedIn (2012)",
    confidence: "possible",
    category: "social",
    notes: "Change password immediately; enable two-factor authentication.",
  },
  {
    site: "Twitter / X",
    siteUrl: "https://x.com",
    logo: "/logos/twitter.svg",
    discoverySource: "Breach — Twitter (2022)",
    confidence: "possible",
    category: "social",
    notes: "Review connected apps and revoke unused access.",
  },
  {
    site: "Adobe",
    siteUrl: "https://adobe.com",
    logo: "/logos/adobe.svg",
    discoverySource: "Breach — Adobe (2013)",
    confidence: "possible",
    category: "productivity",
    notes: "If you have a Creative Cloud subscription, verify billing details.",
  },
  {
    site: "Kickstarter",
    siteUrl: "https://www.kickstarter.com",
    logo: "/logos/kickstarter.svg",
    discoverySource: "Breach — Kickstarter (2014)",
    confidence: "possible",
    category: "ecommerce",
    notes: "Check for any unauthorized pledges or payment methods.",
  },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email: rawEmail, code: rawCode } = body;

    if (!rawEmail || !rawCode) {
      return NextResponse.json(
        { error: "missing_fields", message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const email = String(rawEmail).trim().toLowerCase();
    const code = String(rawCode).trim();

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "invalid_email", message: "A valid email is required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "invalid_format", message: "Verification code must be 6 digits." },
        { status: 400 }
      );
    }

    const storedOtp = await otpStore.get(email);

    if (!storedOtp) {
      return NextResponse.json(
        { error: "otp_not_found", message: "No verification code requested or it has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const now = Date.now();

    // Check expiration
    if (now > storedOtp.expiresAt) {
      await otpStore.delete(email);
      return NextResponse.json(
        { error: "otp_expired", message: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check maximum failed attempts
    if (storedOtp.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      await otpStore.delete(email);
      return NextResponse.json(
        {
          error: "max_attempts_exceeded",
          message: "Too many failed attempts. This verification code has been invalidated. Please request a new one.",
        },
        { status: 429 }
      );
    }

    // Verify code
    if (storedOtp.code !== code) {
      storedOtp.attempts += 1;
      if (storedOtp.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        await otpStore.delete(email);
        return NextResponse.json(
          {
            error: "max_attempts_exceeded",
            message: "Too many failed attempts. This verification code has been invalidated. Please request a new one.",
          },
          { status: 429 }
        );
      }
      await otpStore.set(email, storedOtp);
      const remaining = OTP_CONFIG.MAX_ATTEMPTS - storedOtp.attempts;
      return NextResponse.json(
        {
          error: "invalid_code",
          message: `That code is incorrect. Please try again (${remaining} attempt${remaining === 1 ? "" : "s"} remaining).`,
        },
        { status: 401 }
      );
    }

    // Successful verification -> invalidate OTP
    await otpStore.delete(email);

    return NextResponse.json({
      status: "ok",
      details_available: true,
      accounts: MOCK_ACCOUNTS,
    });
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid request body." },
      { status: 400 }
    );
  }
}
