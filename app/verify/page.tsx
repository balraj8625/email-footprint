"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, RefreshCw, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VerificationInput } from "@/components/VerificationInput";
import { useToast } from "@/components/ToastProvider";
import { maskEmail, loadSession, saveSession } from "@/lib/utils";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN = 30; // seconds

function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { addToast } = useToast();

  const emailParam = params.get("email") ?? "";
  const [verifying, setVerifying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(true); // Assumed sent from results page

  useEffect(() => {
    if (!emailParam) {
      router.replace("/");
    }
  }, [emailParam, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCodeComplete = async (code: string) => {
    setVerifying(true);
    setHasError(false);

    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, code }),
      });
      const json = await res.json();

      if (!res.ok) {
        setHasError(true);
        addToast(json.message ?? "Invalid code. Please try again.", "error");
        return;
      }

      // Success - save accounts to session and navigate to details
      saveSession({ email: emailParam, verified: true, accounts: json.accounts });
      addToast("Email verified! Showing your full results.", "success");
      router.push(`/details?email=${encodeURIComponent(emailParam)}`);
    } catch {
      addToast("Network error. Please try again.", "error");
      setHasError(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN);
    setSent(false);

    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });
      const json = await res.json();

      if (!res.ok) {
        addToast(json.message ?? "Failed to resend. Please try again.", "error");
        setCooldown(0);
        return;
      }

      setSent(true);
      addToast("Verification code resent!", "success");
    } catch {
      addToast("Network error. Please try again.", "error");
      setCooldown(0);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto">
      {/* Check-inbox header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7 text-brand-indigo" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-text">Check your inbox</h1>
          <p className="text-sm text-brand-sub font-body mt-1 leading-relaxed">
            We{sent ? " sent" : "'re sending"} a 6-digit code to{" "}
            <strong className="text-brand-text font-mono">{maskEmail(emailParam)}</strong>
          </p>
        </div>
      </div>

      {/* Code input card */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 space-y-5 shadow-card">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-brand-text font-body text-center">
            Enter your 6-digit code
          </p>
        </div>

        <VerificationInput
          onComplete={handleCodeComplete}
          disabled={verifying}
          hasError={hasError}
        />

        {/* Loading indicator */}
        {verifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-brand-sub font-body" aria-live="polite">
            <Loader2 className="w-4 h-4 animate-spin text-brand-indigo" aria-hidden="true" />
            Verifying…
          </div>
        )}

        {/* Submit hint */}
        <p className="text-[11px] text-brand-sub/70 text-center font-body">
          Code auto-submits when all 6 digits are entered
        </p>
      </div>

      {/* Resend + skip */}
      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold transition-colors font-body",
            cooldown > 0
              ? "text-brand-sub/50 cursor-not-allowed"
              : "text-brand-indigo hover:text-indigo-700"
          )}
          aria-label={cooldown > 0 ? `Resend available in ${cooldown} seconds` : "Resend verification code"}
          aria-disabled={cooldown > 0}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", cooldown > 0 && "animate-spin")} aria-hidden="true" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>

        <button
          onClick={() => router.back()}
          className="text-xs text-brand-sub/70 hover:text-brand-sub transition-colors font-body"
        >
          ← Go back
        </button>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-green mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p className="text-xs text-green-700 font-body leading-relaxed">
          The verification code is sent only to confirm this email belongs to you. We do not store
          your email or results beyond this session.
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={
          <div className="flex items-center gap-2 text-brand-sub">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
