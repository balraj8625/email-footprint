"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Bone({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-lg skeleton", className)}
      aria-hidden="true"
    />
  );
}

export function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading results…" className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-brand-border p-5 flex gap-4"
          style={{ animationDelay: `${i * 80}ms`, opacity: 1 - i * 0.12 }}
        >
          {/* Logo placeholder */}
          <Bone className="w-11 h-11 rounded-xl flex-shrink-0" />

          <div className="flex-1 space-y-2.5">
            {/* Site name */}
            <Bone className="h-4 w-28" />
            {/* Source */}
            <Bone className="h-3 w-48" />
            {/* Notes */}
            <Bone className="h-3 w-64" />
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Badge */}
            <Bone className="h-5 w-16 rounded-full" />
            {/* Buttons */}
            <Bone className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading account cards…</span>
    </div>
  );
}

export function SummaryLoadingSkeleton() {
  return (
    <div role="status" aria-label="Scanning public breach datasets…" className="space-y-5">
      {/* Header Loading */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-6 w-48" />
          <Bone className="h-3.5 w-64" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-20 rounded-xl" />
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Loading banner */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-brand-indigo border-t-transparent animate-spin flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-brand-indigo font-display">
            Querying public breach datasets…
          </p>
          <p className="text-[11px] text-brand-sub font-body">
            Checking XposedOrNot feeds for exposed credentials and associated services.
          </p>
        </div>
      </div>

      {/* Status banner skeleton */}
      <div className="bg-white rounded-2xl border border-brand-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Bone className="w-10 h-10 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Bone className="h-4 w-36" />
            <Bone className="h-3 w-56" />
          </div>
        </div>
      </div>

      {/* Overview stats skeleton */}
      <div className="bg-white rounded-2xl border border-brand-border p-6">
        <Bone className="h-4 w-32 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-8 w-16" />
              <Bone className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Categories skeleton */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 space-y-3">
        <Bone className="h-4 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>

      <span className="sr-only">Analyzing public breach records…</span>
    </div>
  );
}
