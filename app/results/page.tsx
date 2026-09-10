"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldAlert, CheckCircle2, ArrowRight, RefreshCw,
  Database, Users, ShoppingBag, MessageSquare, Download, Info
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SummaryLoadingSkeleton } from "@/components/LoadingSkeleton";
import { Modal, InfoTooltipButton } from "@/components/Modal";
import { useToast } from "@/components/ToastProvider";
import { loadSession, saveSession, maskEmail, getCategoryIcon, getCategoryLabel, downloadJSON } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LookupSummary } from "@/lib/types";

const categoryIcons: Record<string, React.ReactNode> = {
  social: <Users className="w-4 h-4" aria-hidden="true" />,
  ecommerce: <ShoppingBag className="w-4 h-4" aria-hidden="true" />,
  forums: <MessageSquare className="w-4 h-4" aria-hidden="true" />,
};

function ResultsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { addToast } = useToast();

  const emailParam = params.get("email") ?? "";
  const [data, setData] = useState<LookupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ message: string; isRateLimit?: boolean } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const session = loadSession();

    // Try session cache first
    if (session?.lookup && session.email === emailParam) {
      setData(session.lookup as LookupSummary);
      setLoading(false);
      return;
    }

    if (!emailParam) {
      router.replace("/");
      return;
    }

    // Fetch fresh
    setLoading(true);
    setErrorState(null);
    fetch(`/api/lookup?email=${encodeURIComponent(emailParam)}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status === 429) {
            const retryMins = Math.ceil((json.retry_after ?? 300) / 60);
            setErrorState({
              message: `Search rate limit reached. Please wait ${retryMins} minute${retryMins > 1 ? "s" : ""} before scanning again.`,
              isRateLimit: true,
            });
            return null;
          }
          setErrorState({
            message: json.message || "We could not complete the breach check right now. Please try again in a few moments.",
          });
          return null;
        }
        return json;
      })
      .then((d) => {
        if (d) {
          setData(d);
          saveSession({ email: emailParam, lookup: d });
        }
      })
      .catch(() => {
        setErrorState({
          message: "Unable to reach lookup service. Please check your network connection and try again.",
        });
      })
      .finally(() => setLoading(false));
  }, [emailParam, router]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        addToast(json.message ?? "Failed to send verification code. Please try again.", "error");
        return;
      }

      saveSession({ email: emailParam });
      addToast("Verification code sent! Check your inbox.", "success");
      router.push(`/verify?email=${encodeURIComponent(emailParam)}`);
    } catch {
      addToast("Network error. Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!data) return;
    downloadJSON(
      { email: maskEmail(emailParam), summary: data.summary, hints: data.hints, generatedAt: new Date().toISOString() },
      `email-footprint-summary-${Date.now()}.json`
    );
    addToast("Summary report exported as JSON.", "success");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SummaryLoadingSkeleton />
      </div>
    );
  }

  // Error state display
  if (errorState) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-brand-text">
              Results for{" "}
              <span className="text-brand-indigo font-mono text-base">{maskEmail(emailParam)}</span>
            </h1>
            <p className="text-xs text-brand-sub font-body mt-0.5">Lookup interrupted</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-brand-border bg-white text-brand-sub hover:text-brand-text hover:bg-brand-bg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            New search
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display font-bold text-base text-brand-text">
              {errorState.isRateLimit ? "Rate limit reached" : "Lookup temporarily unavailable"}
            </h2>
            <p className="text-xs text-brand-sub font-body leading-relaxed">
              {errorState.message}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => {
                setLoading(true);
                setErrorState(null);
                fetch(`/api/lookup?email=${encodeURIComponent(emailParam)}`)
                  .then(async (r) => {
                    const json = await r.json().catch(() => ({}));
                    if (!r.ok) throw new Error(json.message || "Failed");
                    return json;
                  })
                  .then((d) => {
                    setData(d);
                    saveSession({ email: emailParam, lookup: d });
                  })
                  .catch(() => {
                    setErrorState({
                      message: "Lookup service unavailable. Please retry shortly.",
                    });
                  })
                  .finally(() => setLoading(false));
              }}
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl bg-brand-indigo text-white hover:bg-indigo-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Try again
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl border border-brand-border text-brand-sub hover:bg-brand-bg transition-colors"
            >
              Search another email
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalBreaches = data.summary.breach_count;
  const possibleAccounts = data.summary.possible_accounts;
  const hasResults = possibleAccounts > 0 || totalBreaches > 0;

  // Risk profile computation
  const riskStatus =
    totalBreaches >= 15
      ? { label: "High Exposure", color: "text-red-700 bg-red-50 border-red-200", icon: "🔴", desc: "Found across multiple public breach sources. Password changes and security checks strongly recommended." }
      : totalBreaches >= 4
      ? { label: "Moderate Exposure", color: "text-amber-800 bg-amber-50 border-amber-200", icon: "🟡", desc: "Detected in public breach lists. Review services where this email is used." }
      : totalBreaches > 0
      ? { label: "Low Exposure", color: "text-blue-800 bg-blue-50 border-blue-200", icon: "🔵", desc: "Found in few public records. Ensure unique passwords across all active accounts." }
      : { label: "Clean / No Breaches Found", color: "text-green-800 bg-green-50 border-green-200", icon: "🟢", desc: "No appearances in public breach records indexed by XposedOrNot." };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-brand-text">
            Footprint Summary
          </h1>
          <p className="text-xs text-brand-sub font-body mt-1">
            Scanned for <span className="font-mono text-brand-indigo font-semibold">{maskEmail(emailParam)}</span>
          </p>
        </div>

        <div className="flex gap-2">
          {hasResults && (
            <button
              onClick={handleDownloadSummary}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-brand-border bg-white text-brand-sub hover:text-brand-text hover:bg-brand-bg transition-colors shadow-xs"
              aria-label="Download summary as JSON"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-brand-border bg-white text-brand-sub hover:text-brand-text hover:bg-brand-bg transition-colors shadow-xs"
            aria-label="Search a different email"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            New search
          </button>
        </div>
      </div>

      {hasResults ? (
        <>
          {/* Risk Level Banner */}
          <div className={cn("rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 transition-colors", riskStatus.color)}>
            <span className="text-xl select-none" aria-hidden="true">{riskStatus.icon}</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-bold uppercase tracking-wider font-mono">
                  Exposure Assessment: {riskStatus.label}
                </p>
                <span className="text-[11px] opacity-75 font-mono">XposedOrNot Public Feed</span>
              </div>
              <p className="text-xs font-body leading-relaxed opacity-90">
                {riskStatus.desc}
              </p>
            </div>
          </div>

          {/* Key Metrics Overview Card */}
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-brand-text font-display">Breach Metrics</h2>
                <InfoTooltipButton label="How are results calculated?" onClick={() => setInfoOpen(true)} />
              </div>
              <span className="text-[11px] text-brand-sub font-mono">
                {data.summary.sources_checked} public feed checked
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 divide-x divide-brand-border">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-brand-indigo mb-1">
                  <Database className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-brand-sub uppercase tracking-wider font-mono hidden sm:inline">Source</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-display text-brand-text">
                  {data.summary.sources_checked.toLocaleString()}
                </p>
                <p className="text-[11px] text-brand-sub font-body leading-tight">Public feed</p>
              </div>

              <div className="pl-3 sm:pl-6 space-y-1">
                <div className="flex items-center gap-1.5 text-red-500 mb-1">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-brand-sub uppercase tracking-wider font-mono hidden sm:inline">Breaches</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-display text-red-600">
                  {totalBreaches.toLocaleString()}
                </p>
                <p className="text-[11px] text-brand-sub font-body leading-tight">Breaches found</p>
              </div>

              <div className="pl-3 sm:pl-6 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                  <Users className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-brand-sub uppercase tracking-wider font-mono hidden sm:inline">Accounts</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-display text-amber-600">
                  {possibleAccounts.toLocaleString()}
                </p>
                <p className="text-[11px] text-brand-sub font-body leading-tight">Possible accounts</p>
              </div>
            </div>
          </div>

          {/* Account Categories Section */}
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-brand-text font-display">
                  Detected Account Categories
                </h2>
                <p className="text-xs text-brand-sub font-body mt-0.5">
                  High-level grouping of services linked to exposed breaches
                </p>
              </div>
              <span className="text-[11px] bg-brand-bg text-brand-indigo px-2.5 py-1 rounded-lg font-mono font-semibold border border-brand-border">
                {data.hints.length} {data.hints.length === 1 ? "category" : "categories"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.hints.map((hint) => (
                <div
                  key={hint.category}
                  className="flex items-center justify-between bg-brand-bg/60 rounded-xl px-4 py-3 border border-brand-border hover:border-brand-indigo/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0 select-none" aria-hidden="true">
                      {getCategoryIcon(hint.category)}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-brand-text font-body">
                        {getCategoryLabel(hint.category)}
                      </p>
                      <p className="text-[11px] text-brand-sub/80 font-body">
                        Associated breach records
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-brand-indigo bg-white px-2.5 py-1 rounded-lg border border-brand-border shadow-2xs">
                    {hint.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification & Deeper Details Callout */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-indigo-50/40 to-cyan-50/80 rounded-2xl border border-indigo-200 p-6 shadow-card">
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-11 h-11 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center flex-shrink-0 shadow-sm text-brand-indigo">
                <ShieldAlert className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-brand-text text-base">
                    Unlock Full Breach & Account Details
                  </h3>
                  <span className="text-[10px] bg-indigo-100 text-brand-indigo font-mono px-2 py-0.5 rounded-full font-semibold">
                    Free · No Account
                  </span>
                </div>
                <p className="text-xs text-brand-sub font-body leading-relaxed">
                  We found <strong>{possibleAccounts.toLocaleString()} possible accounts</strong> across{" "}
                  <strong>{totalBreaches.toLocaleString()} breaches</strong>. Verify email ownership via a free 6-digit one-time code to reveal:
                </p>
                <ul className="text-xs text-brand-sub font-body space-y-1 list-disc list-inside pt-1">
                  <li>Specific site and domain names</li>
                  <li>Breach sources and dates</li>
                  <li>Direct account security and password recommendations</li>
                </ul>

                {/* Blurred mockup teaser */}
                <div className="mt-3 space-y-2 pt-1" aria-hidden="true">
                  {[...Array(Math.min(possibleAccounts, 2))].map((_, i) => (
                    <div
                      key={i}
                      className="h-9 rounded-xl bg-white/80 border border-indigo-100/80 blur-[2.5px] opacity-40"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading}
                className={cn(
                  "flex-shrink-0 flex items-center justify-center gap-2 bg-brand-indigo text-white text-sm font-semibold",
                  "px-5 py-3 rounded-xl transition-all duration-150 hover:bg-indigo-600 active:scale-95 shadow-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed self-stretch sm:self-center",
                  "focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2"
                )}
                aria-label="Verify your email to see full results"
              >
                Verify Email
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      ) : (
        // Clean / No results state
        <div className="bg-white rounded-3xl border border-brand-border p-8 sm:p-12 text-center space-y-6 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-brand-green">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-green-50 text-green-700 border border-green-200">
              No Public Breaches Found
            </span>
            <h2 className="font-display font-bold text-xl text-brand-text">
              Good news — your email wasn&apos;t found
            </h2>
            <p className="text-xs sm:text-sm text-brand-sub font-body leading-relaxed">
              We did not find any public breach records indexed for this email address in the XposedOrNot public datasets.
            </p>
          </div>

          {/* Reassurance & Limitations Notice */}
          <div className="bg-brand-bg rounded-2xl border border-brand-border p-4 max-w-lg mx-auto text-left space-y-1.5">
            <p className="text-xs font-semibold text-brand-text font-body">
              What does this mean?
            </p>
            <p className="text-xs text-brand-sub leading-relaxed font-body">
              While your email does not appear in public breach feeds, this check covers indexed public datasets and does not guarantee that private accounts or unindexed databases have never been exposed. Using unique passwords for each service remains essential.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleVerify}
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl bg-brand-indigo text-white hover:bg-indigo-600 transition-colors active:scale-95 shadow-sm"
            >
              Verify Email for Deeper Check
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl border border-brand-border text-brand-sub hover:bg-brand-bg transition-colors"
            >
              Check another email
            </button>
          </div>
        </div>
      )}

      {/* Privacy reminder note */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-brand-sub/70 font-mono">
          Session-only · No server storage · Results clear automatically in 5 minutes
        </p>
      </div>

      <Modal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="How are results calculated?"
      >
        <div className="space-y-3">
          <p>
            Email Footprint queries publicly available breach datasets and open security feeds provided by <strong>XposedOrNot</strong> to infer which services may be associated with your email address.
          </p>
          <p>
            <strong>Probabilistic Inferences:</strong> A &quot;Possible&quot; result indicates that this email address appeared in a publicly exposed database associated with that service. It does not mean your active credentials are currently compromised or that you still have an open account.
          </p>
          <p>
            <strong>Privacy & Security:</strong> This application never asks for or stores passwords. All search data exists purely within your current browser session and is purged automatically.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <Suspense fallback={<SummaryLoadingSkeleton />}>
          <ResultsContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
