"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Zap, Eye, Lock, ExternalLink } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";
import { saveSession } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSearch = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lookup?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          addToast(
            `Too many requests — please try after ${Math.ceil((data.retry_after ?? 300) / 60)} minutes.`,
            "warning",
            6000
          );
          return;
        }
        addToast(data.message ?? "Something went wrong. Please try again.", "error");
        return;
      }

      saveSession({ email, lookup: data });
      router.push(`/results?email=${encodeURIComponent(email)}`);
    } catch {
      addToast("Network error — please check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen hero-mesh">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        {/* Hero */}
        <div className="w-full max-w-2xl mx-auto space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-brand-indigo text-xs font-semibold px-4 py-1.5 rounded-full font-mono">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              No signup · No storage · Session only
            </span>
          </div>

          {/* Headline */}
          <div className="text-center space-y-4">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-brand-text leading-[1.05] tracking-tight">
              Discover your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo to-brand-cyan">
                digital trail
              </span>
            </h1>
            <p className="text-base sm:text-lg text-brand-sub font-body max-w-md mx-auto leading-relaxed">
              Find out which sites may be linked to your email using breach data and public
              sources — without handing over a password.
            </p>
          </div>

          {/* Search card */}
          <div className="bg-white rounded-3xl border border-brand-border shadow-card p-6 sm:p-8 space-y-5">
            <PrivacyBanner />
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: <Zap className="w-4 h-4" />, label: "Instant scan", sub: "No waiting" },
              { icon: <Eye className="w-4 h-4" />, label: "Breach data", sub: "Public sources" },
              { icon: <Lock className="w-4 h-4" />, label: "Session only", sub: "Cleared in 5 min" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white rounded-2xl border border-brand-border p-4 flex flex-col items-center gap-2"
              >
                <span className="text-brand-indigo" aria-hidden="true">{f.icon}</span>
                <span className="text-xs font-semibold text-brand-text font-display">{f.label}</span>
                <span className="text-[11px] text-brand-sub font-body">{f.sub}</span>
              </div>
            ))}
          </div>

          {/* Source note */}
          <p className="text-center text-xs text-brand-sub/70 font-body leading-relaxed">
            Breach data sourced from public feeds including{" "}
            <a
              href="https://xposedornot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-brand-indigo transition-colors inline-flex items-center gap-0.5"
            >
              XposedOrNot
              <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
            </a>
            . Results are inferences only. This app never requests your password.
          </p>
        </div>
      </main>

      {/* Sample email hints */}
      <div className="text-center pb-8 px-4">
        <p className="text-xs text-brand-sub/60 font-mono">
          Try: <code className="bg-brand-bg px-1.5 py-0.5 rounded text-brand-indigo">test@example.com</code>{" "}
          · <code className="bg-brand-bg px-1.5 py-0.5 rounded text-brand-sub">none@example.com</code> (no results){" "}
          · <code className="bg-brand-bg px-1.5 py-0.5 rounded text-brand-sub">rate@example.com</code> (rate limited)
        </p>
      </div>

      <Footer />
    </div>
  );
}
