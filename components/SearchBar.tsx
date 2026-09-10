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
    const nextState = !captchaChecked;
    setCaptchaChecked(nextState);
    if (nextState) {
      setCaptchaError(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full space-y-4", className)} noValidate>
      {/* 1. Email input */}
      <div className="relative">
        <label htmlFor="email-input" className="sr-only">
          Your email address
        </label>
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3.5 transition-all duration-200",
            isInvalid || isEmpty
              ? "border-red-400 shadow-none"
              : value && validateEmail(value)
              ? "border-brand-indigo shadow-glow"
              : "border-brand-border focus-within:border-brand-indigo focus-within:shadow-glow"
          )}
        >
          <Search className="w-5 h-5 text-brand-sub flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            id="email-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (touched) setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            disabled={loading}
            aria-invalid={isInvalid || isEmpty}
            aria-describedby={isInvalid || isEmpty ? "email-error" : "email-hint"}
            className="flex-1 bg-transparent text-brand-text placeholder:text-brand-sub/60 outline-none font-body text-base disabled:opacity-60"
          />
        </div>

        {/* Inline email validation message */}
        {(isInvalid || isEmpty) && (
          <div
            id="email-error"
            className="flex items-center gap-1.5 mt-2 text-red-500 text-sm"
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
            Enter the email address you want to check
          </p>
        )}
      </div>

      {/* 2. Mock CAPTCHA checkbox */}
      <div className="space-y-1.5">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border bg-white/80 px-4 py-3 transition-colors",
            captchaError
              ? "border-red-400 bg-red-50/20"
              : "border-brand-border hover:border-brand-indigo/40"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCaptchaToggle}
              role="checkbox"
              aria-checked={captchaChecked}
              aria-label="I'm not a robot"
              className={cn(
                "w-5 h-5 rounded border-2 transition-all duration-150 flex items-center justify-center flex-shrink-0",
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
            <label
              onClick={handleCaptchaToggle}
              className="text-sm text-brand-sub font-body cursor-pointer select-none"
            >
              I&apos;m not a robot
            </label>
          </div>

          <div className="flex flex-col items-end opacity-40 select-none">
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-sub font-medium">
              Security Check
            </span>
            <span className="text-[9px] text-brand-sub/60 font-body">Demo Verification</span>
          </div>
        </div>

        {/* CAPTCHA validation error */}
        {captchaError && (
          <div
            id="captcha-error"
            className="flex items-center gap-1.5 text-red-500 text-sm px-1"
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
            "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-6 text-base font-semibold text-white transition-all duration-200 shadow-sm",
            "bg-brand-indigo hover:bg-indigo-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2"
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
      <p className="pt-1 text-xs text-brand-sub/70 text-center font-body">
        <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" aria-hidden="true" />
        Searches are rate-limited to protect the service. Max 5 searches per hour.
      </p>
    </form>
  );
}
