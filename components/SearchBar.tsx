"use client";

import React, { useState, useRef } from "react";
import { Search, AlertCircle, Loader2, ShieldCheck, Check } from "lucide-react";
import { cn, validateEmail } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (email: string) => void;
  loading?: boolean;
  defaultValue?: string;
  className?: string;
}

export function SearchBar({ onSearch, loading = false, defaultValue = "", className }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isInvalid = touched && value.length > 0 && !validateEmail(value);
  const isEmpty = touched && value.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setTouched(true);

    const isEmailValid = validateEmail(value);
    if (!isEmailValid) {
      inputRef.current?.focus();
      if (!captchaChecked) {
        setCaptchaError(true);
      }
      return;
    }

    if (!captchaChecked) {
      setCaptchaError(true);
      return;
    }

    setCaptchaError(false);
    onSearch(value.trim().toLowerCase());
  };

  const handleCaptchaToggle = () => {
    if (loading) return;
    const nextState = !captchaChecked;
    setCaptchaChecked(nextState);
    if (nextState) {
      setCaptchaError(false);
    }
  };

  const handleCaptchaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleCaptchaToggle();
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

      {/* 2. Mock CAPTCHA checkbox */}
      <div className="space-y-1.5">
        <div
          onClick={handleCaptchaToggle}
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
                handleCaptchaToggle();
              }}
              onKeyDown={handleCaptchaKeyDown}
              role="checkbox"
              aria-checked={captchaChecked}
              aria-label="I'm not a robot"
              disabled={loading}
              className={cn(
                "w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center flex-shrink-0",
                "focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 outline-none",
                captchaChecked
                  ? "border-brand-indigo bg-brand-indigo"
                  : captchaError
                  ? "border-red-400 bg-white"
                  : "border-gray-300 bg-white hover:border-brand-indigo"
              )}
            >
              {captchaChecked && (
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" aria-hidden="true" />
              )}
            </button>
            <span
              className="text-xs sm:text-sm text-brand-text font-body font-medium select-none"
            >
              I&apos;m not a robot
            </span>
          </div>

          <div className="flex flex-col items-end opacity-40 select-none pointer-events-none">
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-sub font-medium">
              Security Check
            </span>
            <span className="text-[9px] text-brand-sub/70 font-body">Demo Verification</span>
          </div>
        </div>

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
        <span>Searches are rate-limited to protect the service. Max 5 searches per hour.</span>
      </p>
    </form>
  );
}
