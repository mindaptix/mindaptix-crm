"use client";

import React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordWithToken, type PasswordResetState } from "@/features/auth/actions";
import { Feedback } from "@/shared/ui/feedback";

type ResetPasswordScreenProps = {
  token: string;
  isExpired?: boolean;
};

const INITIAL_STATE: PasswordResetState = {};

export function ResetPasswordScreen({ token, isExpired = false }: ResetPasswordScreenProps) {
  const boundAction = resetPasswordWithToken.bind(null, token);
  const [state, formAction, pending] = useActionState(boundAction, INITIAL_STATE);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  if (isExpired) {
    return (
      <ResetPageShell>
        <Feedback>This reset link has expired or is invalid. Please request a new one.</Feedback>
        <div className="mt-5 text-center">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#083450,#0e7490)" }}
          >
            Request new link
          </Link>
        </div>
      </ResetPageShell>
    );
  }

  if (state.success) {
    return (
      <ResetPageShell>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(13,148,136,0.12)", border: "2px solid #0d9488" }}>
            <svg fill="none" height="28" stroke="#0d9488" strokeWidth="2.5" viewBox="0 0 24 24" width="28">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Password Reset!</h3>
            <p className="mt-1 text-sm text-slate-400">
              Your password has been updated and all other devices have been signed out.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#083450,#0e7490)" }}
          >
            Sign in with new password
          </Link>
        </div>
      </ResetPageShell>
    );
  }

  return (
    <ResetPageShell>
      <h2 className="text-2xl font-black leading-snug text-gray-900 sm:text-[1.6rem]">
        Reset Password
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Choose a strong new password for your account.
      </p>

      {state.error && (
        <div className="mt-4">
          <Feedback>{state.error}</Feedback>
        </div>
      )}

      <form action={formAction} className="mt-5 space-y-4">
        {/* New password */}
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-500">
            New Password
          </label>
          <PasswordInputBox
            name="password"
            placeholder="Min 8 chars, upper, lower, number, symbol"
            show={showNew}
            onToggleShow={() => setShowNew(v => !v)}
          />
          {state.fieldErrors?.password && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.password}</p>
          )}
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {[
              "8+ characters",
              "Uppercase letter",
              "Lowercase letter",
              "Number",
              "Special character",
            ].map(req => (
              <li key={req} className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Confirm password */}
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-500">
            Confirm Password
          </label>
          <PasswordInputBox
            name="confirmPassword"
            placeholder="Re-enter your new password"
            show={showConfirm}
            onToggleShow={() => setShowConfirm(v => !v)}
          />
          {state.fieldErrors?.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          className="group relative mt-1 w-full overflow-hidden rounded-xl py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#083450 0%,#0e7490 50%,#083450 100%)", backgroundSize: "200% 100%" }}
          disabled={pending}
          type="submit"
        >
          <span className="relative z-10">{pending ? "Resetting…" : "Reset Password"}</span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-1.5">
        <svg fill="none" height="12" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" width="12">
          <rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-center text-[12px] text-slate-400">
          <Link
            className="font-bold transition hover:opacity-70"
            style={{ color: "#0a7c6e" }}
            href="/login"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </ResetPageShell>
  );
}

/* ── Shared shell ── */

function ResetPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg,#eef2f7 0%,#e8f4f8 50%,#eef2f7 100%)" }}
    >
      <div className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: "radial-gradient(circle,rgba(13,61,90,0.055) 1px,transparent 1px)",
          backgroundSize: "26px 26px",
        }} />
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

        {children}
      </div>
    </div>
  );
}

/* ── Password input with show/hide toggle ── */

function PasswordInputBox({
  name,
  placeholder,
  show,
  onToggleShow,
}: {
  name: string;
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
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
          <rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-slate-400 sm:py-3"
        type={show ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete="new-password"
        required
      />
      <button
        aria-label={show ? "Hide password" : "Show password"}
        className="shrink-0 text-slate-400 transition hover:text-slate-600"
        onClick={onToggleShow}
        type="button"
      >
        {show ? (
          <svg fill="none" height="17" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="17">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" x2="23" y1="1" y2="23" />
          </svg>
        ) : (
          <svg fill="none" height="17" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="17">
            <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
