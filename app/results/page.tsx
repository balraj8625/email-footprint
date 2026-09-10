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
    fetch(`/api/lookup?email=${encodeURIComponent(emailParam)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        saveSession({ email: emailParam, lookup: d });
      })
      .catch(() => {
        addToast("Failed to load results. Please try again.", "error");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [emailParam, router, addToast]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });
      const json = await res.json();

      if (!res.ok) {
        addToast(json.message ?? "Failed to send verification email.", "error");
        return;
      }

      saveSession({ email: emailParam });
      addToast("Verification email sent! Check your inbox.", "success");
      router.push(`/verify?email=${encodeURIComponent(emailParam)}`);
    } catch {
      addToast("Network error. Please try again.", "error");
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
    addToast("Summary exported.", "success");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SummaryLoadingSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const hasResults = data.summary.possible_accounts > 0 || data.summary.breach_count > 0;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-brand-text">
            Results for{" "}
            <span className="text-brand-indigo font-mono text-base">{maskEmail(emailParam)}</span>
          </h1>
          <p className="text-xs text-brand-sub font-body mt-0.5">
            Checked {data.summary.sources_checked} sources · Results are preliminary until verified
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadSummary}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-sub hover:text-brand-text hover:bg-brand-bg transition-colors"
            aria-label="Download summary as JSON"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export
          </button>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-sub hover:text-brand-text hover:bg-brand-bg transition-colors"
            aria-label="Search a different email"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            New search
          </button>
        </div>
      </div>

      {hasResults ? (
        <>
          {/* Summary stats */}
          <div className="bg-white rounded-2xl border border-brand-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-brand-text font-display">Overview</h2>
              <InfoTooltipButton label="How are results calculated?" onClick={() => setInfoOpen(true)} />
            </div>
            <div className="grid grid-cols-3 gap-4 divide-x divide-brand-border">
              {[
                {
                  icon: <Database className="w-4 h-4 text-brand-indigo" aria-hidden="true" />,
                  value: data.summary.sources_checked,
                  label: "Sources checked",
                },
                {
                  icon: <ShieldAlert className="w-4 h-4 text-red-400" aria-hidden="true" />,
                  value: data.summary.breach_count,
                  label: "Breaches found",
                },
                {
                  icon: <Users className="w-4 h-4 text-amber-400" aria-hidden="true" />,
                  value: data.summary.possible_accounts,
                  label: "Possible accounts",
                },
              ].map((stat) => (
                <div key={stat.label} className="pl-4 first:pl-0 space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">{stat.icon}</div>
                  <p className="text-2xl font-bold font-display text-brand-text">{stat.value}</p>
                  <p className="text-[11px] text-brand-sub font-body leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Category hints */}
          <div className="bg-white rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-semibold text-brand-text font-display mb-3">
              Account categories detected
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.hints.map((hint) => (
                <div
                  key={hint.category}
                  className="flex items-center gap-2 bg-brand-bg rounded-xl px-4 py-2.5 border border-brand-border"
                >
                  <span className="text-base" aria-hidden="true">{getCategoryIcon(hint.category)}</span>
                  <div>
                    <p className="text-xs font-semibold text-brand-text font-body">
                      {getCategoryLabel(hint.category)}
                    </p>
                    <p className="text-[10px] text-brand-sub font-mono">
                      {hint.count} {hint.count === 1 ? "account" : "accounts"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Masked/locked details callout */}
          <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-200 p-6">
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-brand-indigo" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-display font-semibold text-brand-text text-sm">
                  Full details are locked until you verify
                </h3>
                <p className="text-xs text-brand-sub font-body leading-relaxed">
                  We found <strong>{data.summary.possible_accounts} possible accounts</strong> across{" "}
                  <strong>{data.summary.breach_count} breaches</strong>. Verify your email to see the
                  site names, breach sources, and specific recommendations. We&apos;ll send a one-time
                  code — no account required.
                </p>
                {/* Blurred placeholder rows */}
                <div className="mt-3 space-y-2" aria-hidden="true">
                  {[...Array(Math.min(data.summary.possible_accounts, 3))].map((_, i) => (
                    <div
                      key={i}
                      className="h-10 rounded-xl bg-white/70 border border-indigo-100 blur-[2px] opacity-50"
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 bg-brand-indigo text-white text-sm font-semibold",
                  "px-5 py-2.5 rounded-xl transition-all duration-150 hover:bg-indigo-600 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-center",
                  "focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2"
                )}
                aria-label="Verify your email to see full results"
              >
                Verify email
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      ) : (
        // No results state
        <div className="bg-white rounded-2xl border border-brand-border p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-brand-green" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-brand-text">No public breaches found</h2>
            <p className="text-sm text-brand-sub font-body mt-1 max-w-sm mx-auto leading-relaxed">
              We didn&apos;t find this email in any public breach datasets we checked. This is a good
              sign, but doesn&apos;t guarantee your data hasn&apos;t been exposed elsewhere.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleVerify}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-indigo text-white hover:bg-indigo-600 transition-colors active:scale-95"
            >
              Verify email for deeper check
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border border-brand-border text-brand-sub hover:bg-brand-bg transition-colors"
            >
              Try another email
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="How are results calculated?"
      >
        <div className="space-y-3">
          <p>Email Footprint queries publicly available breach datasets and other open data sources to infer which services may be associated with your email address.</p>
          <p>Sources include breach feeds such as <strong>XposedOrNot</strong> and similar public datasets. Data is cross-referenced by email domain and username patterns.</p>
          <p><strong>Important:</strong> All results are probabilistic inferences. A &quot;Possible&quot; result means your email appeared in breach data associated with a service — it does not confirm you have an active account there.</p>
          <p className="text-xs text-brand-sub/70">This service never requests your password, and results are only shown within your current session.</p>
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
