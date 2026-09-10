"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, AlertCircle, Loader2, ShieldCheck, Check } from "lucide-react";
import { cn, validateEmail } from "@/lib/utils";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

interface SearchBarProps {
  onSearch: (email: string, captchaToken: string) => void;
  loading?: boolean;
  defaultValue?: string;
  className?: string;
}

export function SearchBar({ onSearch, loading = false, defaultValue = "", className }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaError, setCaptchaError] = useState(false);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Dynamically load Cloudflare Turnstile script if site key is configured
  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;

    if (window.turnstile && turnstileContainerRef.current && !widgetIdRef.current) {
      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaError(false);
          },
          "expired-callback": () => {
            setCaptchaToken("");
          },
          "error-callback": () => {
            setCaptchaToken("");
          },
        });
        widgetIdRef.current = id;
        setTurnstileLoaded(true);
      } catch {
        // Fallback to local security verification
      }
      return;
    }

    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile && turnstileContainerRef.current && !widgetIdRef.current) {
          try {
            const id = window.turnstile.render(turnstileContainerRef.current, {
              sitekey: siteKey,
              theme: "light",
              callback: (token: string) => {
                setCaptchaToken(token);
                setCaptchaError(false);
              },
              "expired-callback": () => {
                setCaptchaToken("");
              },
              "error-callback": () => {
                setCaptchaToken("");
              },
            });
            widgetIdRef.current = id;
            setTurnstileLoaded(true);
          } catch {
            // Script loaded but rendering failed
          }
        }
      };
      document.head.appendChild(script);
    }
  }, [siteKey]);

  const isInvalid = touched && value.length > 0 && !validateEmail(value);
  const isEmpty = touched && value.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setTouched(true);

    const isEmailValid = validateEmail(value);
    if (!isEmailValid) {
      inputRef.current?.focus();
      if (!captchaToken) {
        setCaptchaError(true);
      }
      return;
    }

    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }

    setCaptchaError(false);
    onSearch(value.trim().toLowerCase(), captchaToken);
  };

  const handleFallbackCaptchaToggle = () => {
    if (loading) return;
    if (captchaToken) {
      setCaptchaToken("");
    } else {
      // Generate standard dev client token
      const generatedToken = `dev_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setCaptchaToken(generatedToken);
      setCaptchaError(false);
    }
  };

  const handleCaptchaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleFallbackCaptchaToggle();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full space-y-4", className)} noValidate>
      {/* 1. Email input */}
      <div className="relative">
        <label htmlFor="email-input" className="block text-xs font-semibold text-brand-text mb-1.5 font-display">
          Email Address
        </label>
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 sm:py-3.5 transition-all duration-200",
            isInvalid || isEmpty
              ? "border-red-400 shadow-none ring-1 ring-red-400/20"
              : value && validateEmail(value)
              ? "border-brand-indigo shadow-glow"
              : "border-brand-border focus-within:border-brand-indigo focus-within:shadow-glow focus-within:ring-2 focus-within:ring-brand-indigo/10"
          )}
        >
          <Search className="w-5 h-5 text-brand-sub flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            id="email-input"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="e.g. name@example.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (touched) setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            disabled={loading}
            aria-invalid={isInvalid || isEmpty}
            aria-describedby={isInvalid || isEmpty ? "email-error" : "email-hint"}
            className="flex-1 bg-transparent text-brand-text placeholder:text-brand-sub/60 outline-none font-body text-base disabled:opacity-60 disabled:cursor-not-allowed min-w-0"
          />
        </div>

        {/* Inline email validation message */}
        {(isInvalid || isEmpty) && (
          <div
            id="email-error"
            className="flex items-center gap-1.5 mt-2 text-red-500 text-xs sm:text-sm animate-in fade-in duration-150"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {isEmpty ? "Please enter your email address." : "That doesn't look like a valid email."}
            </span>
          </div>
        )}
        {!isInvalid && !isEmpty && (
          <p id="email-hint" className="sr-only">
            Enter the email address you want to check against public breach feeds
          </p>
        )}
      </div>

      {/* 2. CAPTCHA widget */}
      <div className="space-y-1.5">
        {siteKey && (
          <div
            ref={turnstileContainerRef}
            className={cn("flex justify-center min-h-[65px] transition-all", !turnstileLoaded && "hidden")}
          />
        )}

        {/* Accessible fallback checkbox when Turnstile is not configured or in offline/test environment */}
        {(!siteKey || !turnstileLoaded) && (
          <div
            onClick={handleFallbackCaptchaToggle}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border bg-white/90 px-4 py-3 sm:py-3.5 transition-all duration-150 cursor-pointer select-none",
              captchaError
                ? "border-red-400 bg-red-50/20 ring-1 ring-red-400/20"
                : "border-brand-border hover:border-brand-indigo/50 hover:bg-white"
            )}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFallbackCaptchaToggle();
                }}
                onKeyDown={handleCaptchaKeyDown}
                role="checkbox"
                aria-checked={Boolean(captchaToken)}
                aria-label="I'm not a robot"
                disabled={loading}
                className={cn(
                  "w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center flex-shrink-0",
                  "focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 outline-none",
                  captchaToken
                    ? "border-brand-indigo bg-brand-indigo"
                    : captchaError
                    ? "border-red-400 bg-white"
                    : "border-gray-300 bg-white hover:border-brand-indigo"
                )}
              >
                {Boolean(captchaToken) && (
                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" aria-hidden="true" />
                )}
              </button>
              <span className="text-xs sm:text-sm text-brand-text font-body font-medium select-none">
                I&apos;m not a robot
              </span>
            </div>

            <div className="flex flex-col items-end opacity-40 select-none pointer-events-none">
              <span className="text-[10px] uppercase font-mono tracking-wider text-brand-sub font-medium">
                Security Check
              </span>
              <span className="text-[9px] text-brand-sub/70 font-body">Verification</span>
            </div>
          </div>
        )}

        {/* CAPTCHA validation error */}
        {captchaError && (
          <div
            id="captcha-error"
            className="flex items-center gap-1.5 text-red-500 text-xs sm:text-sm px-1 animate-in fade-in duration-150"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>Please check &quot;I&apos;m not a robot&quot; before checking your email.</span>
          </div>
        )}
      </div>

      {/* 3. Check Email button */}
      <div>
        <button
          type="submit"
          disabled={loading}
          aria-label="Check Email"
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-6 text-sm sm:text-base font-semibold text-white transition-all duration-200 shadow-sm",
            "bg-brand-indigo hover:bg-indigo-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 outline-none"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Scanning public breach data…</span>
            </>
          ) : (
            <span>Check Email</span>
          )}
        </button>
      </div>

      {/* Rate limit notice */}
      <p className="pt-1 text-[11px] sm:text-xs text-brand-sub/70 text-center font-body flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 inline opacity-70 flex-shrink-0" aria-hidden="true" />
        <span>Searches are rate-limited to protect the service. Max 15 searches per 5 minutes.</span>
      </p>
    </form>
  );
}

