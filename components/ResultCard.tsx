"use client";

import React, { useState } from "react";
import { ExternalLink, KeyRound, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { cn, getCategoryLabel } from "@/lib/utils";
import { Modal } from "./Modal";
import type { Account } from "@/lib/types";

interface ResultCardProps {
  account: Account;
  index?: number;
}

const categoryColors: Record<string, string> = {
  social: "bg-violet-50 text-violet-700 border-violet-200",
  ecommerce: "bg-cyan-50 text-cyan-700 border-cyan-200",
  forums: "bg-amber-50 text-amber-700 border-amber-200",
  gaming: "bg-green-50 text-green-700 border-green-200",
  productivity: "bg-blue-50 text-blue-700 border-blue-200",
  streaming: "bg-pink-50 text-pink-700 border-pink-200",
  finance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

const siteInitials: Record<string, { bg: string; text: string }> = {
  LinkedIn: { bg: "#0A66C2", text: "Li" },
  "Twitter / X": { bg: "#000000", text: "X" },
  Adobe: { bg: "#FF0000", text: "Ae" },
  Kickstarter: { bg: "#05CE78", text: "Ks" },
};

export function ResultCard({ account, index = 0 }: ResultCardProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const isVerified = account.confidence === "verified";
  const catColor = categoryColors[account.category ?? "other"] ?? categoryColors.other;
  const initials = siteInitials[account.site] ?? { bg: "#4F46E5", text: account.site.substring(0, 2).toUpperCase() };

  return (
    <>
      <article
        className={cn(
          "group bg-white rounded-2xl border border-brand-border p-5 flex gap-4 transition-all duration-200",
          "hover:shadow-card-hover hover:-translate-y-0.5"
        )}
        style={{ animationDelay: `${index * 60}ms` }}
        aria-label={`Account: ${account.site}`}
      >
        {/* Site logo / initials */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-white text-sm shadow-sm"
          style={{ background: initials.bg }}
          aria-hidden="true"
        >
          {initials.text}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-brand-text font-display text-sm">{account.site}</h3>

            {/* Category tag */}
            {account.category && (
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border font-mono font-medium breach-badge",
                  catColor
                )}
              >
                {getCategoryLabel(account.category)}
              </span>
            )}
          </div>

          {/* Discovery source */}
          <p className="text-xs text-brand-sub font-mono mb-1.5 truncate" title={account.discoverySource}>
            <ShieldAlert className="w-3 h-3 inline mr-1 opacity-60" aria-hidden="true" />
            {account.discoverySource}
          </p>

          {/* Notes */}
          <p className="text-xs text-brand-sub/80 font-body leading-relaxed line-clamp-2">{account.notes}</p>
        </div>

        {/* Right column */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Confidence badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border breach-badge",
              isVerified
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}
            aria-label={`Confidence: ${isVerified ? "Verified" : "Possible — from breach data"}`}
          >
            {isVerified ? (
              <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-2.5 h-2.5" aria-hidden="true" />
            )}
            {isVerified ? "Verified" : "Possible"}
          </span>

          {/* Actions */}
          <div className="flex gap-1.5 mt-auto">
            <a
              href={account.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${account.site}`}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150",
                "bg-brand-bg text-brand-indigo border border-brand-border",
                "hover:bg-indigo-50 hover:border-brand-indigo active:scale-95"
              )}
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              Visit
            </a>

            <a
              href={`${account.siteUrl}/security`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Change password on ${account.site}`}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150",
                "bg-red-50 text-red-600 border border-red-200",
                "hover:bg-red-100 active:scale-95"
              )}
            >
              <KeyRound className="w-3 h-3" aria-hidden="true" />
              Change pw
            </a>
          </div>
        </div>

        {/* Info tooltip button */}
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={`More info about ${account.site} result`}
          className="self-start opacity-0 group-hover:opacity-100 transition-opacity text-brand-sub hover:text-brand-indigo"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </article>

      <Modal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={`About this result: ${account.site}`}
      >
        <div className="space-y-3">
          <p>
            <strong className="text-brand-text">Discovery source:</strong>{" "}
            {account.discoverySource}
          </p>
          <p>
            <strong className="text-brand-text">Confidence:</strong>{" "}
            {isVerified
              ? "Verified — this account was confirmed via OAuth or direct check."
              : "Possible — this email appeared in breach data associated with this service. It is an inference, not a confirmation."}
          </p>
          <p>
            <strong className="text-brand-text">Recommendation:</strong> {account.notes}
          </p>
          <div className="mt-3 pt-3 border-t border-brand-border text-brand-sub/70 text-xs">
            Results are sourced from publicly known breach datasets (e.g. XposedOrNot) and
            other public data sources. They are inferences only. This app never requests or stores
            your password.
          </div>
        </div>
      </Modal>
    </>
  );
}
