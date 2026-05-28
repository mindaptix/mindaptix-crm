"use client";

import React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type PasswordResetRequestState } from "@/features/auth/actions";
import { Feedback } from "@/shared/ui/feedback";

const INITIAL_STATE: PasswordResetRequestState = {};

export function ForgotPasswordScreen() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, INITIAL_STATE);

  const resetUrl = state.resetToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password?token=${state.resetToken}`
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg,#eef2f7 0%,#e8f4f8 50%,#eef2f7 100%)" }}
    >
      {/* Background dot pattern */}
      <div className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: "radial-gradient(circle,rgba(13,61,90,0.055) 1px,transparent 1px)",
          backgroundSize: "26px 26px",
        }} />

      {/* Top accent */}
      <div className="fixed left-0 right-0 top-0 h-[3px]"
        style={{ background: "linear-gradient(90deg,transparent 0%,#0d9488 40%,#0d3d5a 70%,transparent 100%)" }} />

      <div
        className="relative w-full max-w-md rounded-2xl p-5 shadow-xl sm:rounded-3xl sm:p-8 sm:shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 16px 50px rgba(13,61,90,0.12), 0 2px 8px rgba(13,61,90,0.06)",
        }}
      >
        {/* Brand header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
            style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)" }}
          >
            <span className="text-sm font-black text-white">M</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Mindaptix CRM
            </p>
            <p className="text-sm font-bold text-slate-700">Password Recovery</p>
          </div>
        </div>

        {/* Lock icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)" }}
        >
          <svg fill="none" height="28" stroke="#0d9488" strokeWidth="1.8" viewBox="0 0 24 24" width="28">
            <rect height="11" rx="2" width="18" x="3" y="11" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="text-2xl font-black leading-snug text-gray-900 sm:text-[1.6rem]">
          Forgot Password?
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter your registered email. A reset link will be generated for your admin to share with you.
        </p>

        {state.error && (
          <div className="mt-4">
            <Feedback>{state.error}</Feedback>
          </div>
        )}

        {state.success && !resetUrl && (
          <div className="mt-4">
            <Feedback tone="success">
              If this email is registered, a reset link has been created. Contact your admin to complete the reset.
            </Feedback>
          </div>
        )}

        {/* Reset link box — shown when token is returned (no email service) */}
        {resetUrl && (
          <div className="mt-4 rounded-xl p-4" style={{ background: "#f0fdf9", border: "1px solid #99f6e4" }}>
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-teal-700">
              <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Reset link generated — share this with the employee:
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-white p-2.5 shadow-sm"
              style={{ border: "1px solid #ccfbf1" }}>
              <code className="flex-1 break-all text-[11px] text-slate-600 leading-relaxed">
                {resetUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetUrl).catch(() => null);
                }}
                className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-bold text-white transition"
                style={{ background: "#0d9488" }}
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">⏱ This link expires in 1 hour.</p>
          </div>
        )}

        {!state.success && (
          <form action={formAction} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-500">
                Email Address
              </label>
              <div
                className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3.5 transition-all duration-200 focus-within:bg-white"
                style={{ borderColor: "rgba(13,61,90,0.14)" }}
                onFocusCapture={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#0d9488";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(13,148,136,0.1)";
                }}
                onBlurCapture={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,61,90,0.14)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <span className="shrink-0 text-slate-400">
                  <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
                    <rect height="16" rx="2" width="20" x="2" y="4" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-slate-400 sm:py-3"
                  defaultValue={state.values?.email}
                  name="email"
                  placeholder="you@company.com"
                  required
                  spellCheck={false}
                  type="email"
                />
              </div>
            </div>

            <button
              className="group relative mt-1 w-full overflow-hidden rounded-xl py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#083450 0%,#0e7490 50%,#083450 100%)", backgroundSize: "200% 100%" }}
              disabled={pending}
              type="submit"
            >
              <span className="relative z-10">{pending ? "Generating link…" : "Generate Reset Link"}</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5">
          <svg fill="none" height="12" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" width="12">
            <rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-center text-[12px] text-slate-400">
            Remember your password?{" "}
            <Link
              className="font-bold transition hover:opacity-70"
              style={{ color: "#0a7c6e" }}
              href="/login"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
