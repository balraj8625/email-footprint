import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/utils";
import { generateOtp, saveOtp } from "@/lib/otpStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "invalid_email", message: "A valid email is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Simulate occasional error for explicit testing prefix
    if (normalizedEmail.startsWith("fail")) {
      return NextResponse.json(
        { error: "send_failed", message: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    // Generate cryptographically secure 6-digit OTP and store server-side
    const otp = generateOtp();
    saveOtp(normalizedEmail, otp);

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Email Footprint <onboarding@resend.dev>",
            to: [normalizedEmail],
            subject: "Your Email Footprint Verification Code",
            text: `Your 6-digit verification code is: ${otp}. It expires in 10 minutes.`,
          }),
        });

        if (!resendRes.ok) {
          const errorData = await resendRes.json().catch(() => ({}));
          console.error("Resend delivery failed:", errorData);
          return NextResponse.json(
            { error: "send_failed", message: "Failed to deliver verification email. Please try again later." },
            { status: 502 }
          );
        }
      } catch (err) {
        console.error("Failed to connect to email provider:", err);
        return NextResponse.json(
          { error: "network_error", message: "Network error when contacting email provider." },
          { status: 502 }
        );
      }
    } else {
      // Free / student development fallback: log OTP to server console
      console.log(`[DEV OTP] Verification code for ${normalizedEmail}: ${otp}`);
    }

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      status: "ok",
      message: `Verification email sent to ${normalizedEmail}. Check your inbox.`,
      // In development mode only, include dev_code to simplify local testing without Resend credentials
      ...(isDev && !resendApiKey ? { dev_code: otp } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid request body." },
      { status: 400 }
    );
  }
}

