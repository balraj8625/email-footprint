import Link from "next/link";
import { Shield, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-border bg-white/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {/* Brand + tagline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-brand-indigo flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold font-display text-brand-text">Email Footprint</span>
            </div>
            <p className="text-xs text-brand-sub font-body max-w-xs leading-relaxed">
              Session-only. No accounts. No persistent storage. Your data stays yours.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-col sm:flex-row gap-4 sm:gap-8" aria-label="Footer navigation">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-brand-sub/50 uppercase tracking-widest font-mono">
                Legal
              </p>
              <div className="flex flex-col gap-1">
                <Link
                  href="/privacy"
                  className="text-xs text-brand-sub hover:text-brand-indigo transition-colors font-body"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/privacy#data-retention"
                  className="text-xs text-brand-sub hover:text-brand-indigo transition-colors font-body"
                >
                  Data Retention
                </Link>
                <Link
                  href="/privacy#delete"
                  className="text-xs text-brand-sub hover:text-brand-indigo transition-colors font-body"
                >
                  Delete Session
                </Link>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-brand-sub/50 uppercase tracking-widest font-mono">
                Project
              </p>
              <div className="flex flex-col gap-1">
                <a
                  href="https://github.com/balraj8625/email-footprint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-sub hover:text-brand-indigo transition-colors font-body flex items-center gap-1"
                >
                  <Github className="w-3 h-3" aria-hidden="true" />
                  Source Code
                </a>
                <a
                  href="https://xposedornot.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-sub hover:text-brand-indigo transition-colors font-body"
                >
                  XposedOrNot
                </a>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-brand-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <p className="text-[11px] text-brand-sub/60 font-mono">
            © {new Date().getFullYear()} Email Footprint. For informational purposes only.
          </p>
          <p className="text-[11px] text-brand-sub/60 font-mono">
            Results are inferences — not confirmations.
          </p>
        </div>
      </div>
    </footer>
  );
}
