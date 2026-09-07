import { NextResponse } from "next/server";
import { validateEmail } from "@/lib/utils";
import { otpStore, generateSecureOtp, OTP_CONFIG } from "@/lib/otp-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email: rawEmail } = body;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "invalid_email", message: "A valid email is required." },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "invalid_email", message: "A valid email is required." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const existing = await otpStore.get(email);

    if (existing && now - existing.lastSentAt < OTP_CONFIG.RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_CONFIG.RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return NextResponse.json(
        {
          error: "rate_limited",
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          retry_after: waitSeconds,
        },
        { status: 429 }
      );
    }

    const code = generateSecureOtp();

    await otpStore.set(email, {
      code,
      expiresAt: now + OTP_CONFIG.EXPIRATION_MS,
      attempts: 0,
      lastSentAt: now,
    });

    return NextResponse.json({
      status: "ok",
      message: `Verification email sent to ${email}. Check your inbox.`,
    });
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid request body." },
      { status: 400 }
    );
  }
}
