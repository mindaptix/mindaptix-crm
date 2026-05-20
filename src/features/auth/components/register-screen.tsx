"use client";

import React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { registerUser } from "@/features/auth/actions";
import { Feedback } from "@/shared/ui/feedback";
import { INITIAL_AUTH_FORM_STATE } from "@/features/auth/lib/auth-form-state";

type RegisterScreenProps = {
  signupClosed?: boolean;
};

export function RegisterScreen({ signupClosed = false }: RegisterScreenProps) {
  const [state, formAction, pending] = useActionState(registerUser, INITIAL_AUTH_FORM_STATE);

  return (
    <div className="flex min-h-screen">

      {/* ══════════════════════════════════════
          LEFT  —  Branding Panel
      ══════════════════════════════════════ */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-1/2"
        style={{ background: "linear-gradient(145deg,#040f1a 0%,#071e30 35%,#0a3048 65%,#0d3d5a 100%)" }}
      >
        {/* Mesh dot grid */}
        <div className="auth-dot-grid absolute inset-0 opacity-40" />

        {/* Glowing orbs */}
        <div className="animate-orb pointer-events-none absolute -left-32 top-0 h-[500px] w-[500px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle,#0d9488 0%,transparent 65%)" }} />
        <div className="animate-orb-2 pointer-events-none absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#0369a1 0%,transparent 65%)" }} />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-10 pt-10">
          <div className="animate-glow-pulse flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-2xl">
            <span className="text-xl font-black" style={{ color: "#0d3d5a" }}>M</span>
          </div>
          <StatBadge icon={<RocketIcon />} value="Setup" label="Your Workspace" />
        </div>

        {/* Main content */}
        <div className="relative flex flex-1 flex-col justify-center px-10 pb-10 pt-32">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="h-[2px] w-8 rounded-full bg-teal-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-teal-400">
              Get Started
            </span>
          </div>

          <h1 className="text-[3.2rem] font-black leading-[1.08] xl:text-[3.8rem]">
            <span className="text-white/90">CREATE YOUR</span><br />
            <span className="shimmer-text">SUPER ADMIN</span><br />
            <span className="text-white/90">ACCOUNT</span>
          </h1>

          <p className="mt-5 max-w-[16rem] text-sm leading-relaxed text-slate-400">
            The first account becomes the Super Admin — with full control to manage users, roles &amp; company settings.
          </p>

          {/* Steps */}
          <div className="mt-8 space-y-3">
            <Step n="1" label="Create your Super Admin account" done />
            <Step n="2" label="Add your team members & assign roles" />
            <Step n="3" label="Start managing your CRM" />
          </div>

          {/* Mini permission cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs">
            <MiniCard icon={<UsersManageIcon />} label="Manage Users" />
            <MiniCard icon={<SettingsIcon />} label="Full Settings" />
            <MiniCard icon={<RolesIcon />} label="Assign Roles" />
            <MiniCard icon={<DataIcon />} label="All Data Access" />
          </div>
        </div>

        {/* Floating badges */}
        <div className="animate-float absolute right-8 top-1/2 -translate-y-1/2">
          <div className="glass-card-strong flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "rgba(13,148,136,0.25)", border: "1px solid rgba(45,212,191,0.3)" }}>
              <CrownIcon />
            </div>
            <div className="leading-none">
              <p className="text-sm font-black text-white">Super Admin</p>
              <p className="text-[11px] text-teal-300/80">Full Access</p>
            </div>
          </div>
        </div>

        <div className="animate-float-slow absolute bottom-10 right-8">
          <div className="glass-card-strong flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl">
            <ShieldCheckIcon />
            <p className="text-sm font-bold text-white">Enterprise Grade</p>
            <span className="flex h-2 w-2 rounded-full bg-teal-400"
              style={{ boxShadow: "0 0 8px 3px #2dd4bf" }} />
          </div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28"
          style={{ background: "linear-gradient(to top,rgba(4,15,26,0.6),transparent)" }} />
      </div>

      {/* ══════════════════════════════════════
          RIGHT  —  Form Panel
      ══════════════════════════════════════ */}
      <div
        className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-10"
        style={{ background: "linear-gradient(135deg,#eef2f7 0%,#e8f4f8 50%,#eef2f7 100%)" }}
      >
        {/* Background pattern */}
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(13,61,90,0.055) 1px,transparent 1px)",
            backgroundSize: "26px 26px",
          }} />

        {/* Top accent */}
        <div className="absolute left-0 right-0 top-0 h-[3px]"
          style={{ background: "linear-gradient(90deg,transparent 0%,#0d9488 40%,#0d3d5a 70%,transparent 100%)" }} />

        {/* ── Form card ── */}
        <div
          className="relative w-full max-w-md rounded-2xl p-5 shadow-xl sm:rounded-3xl sm:p-8 sm:shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 32px 80px rgba(13,61,90,0.14), 0 2px 8px rgba(13,61,90,0.06)",
          }}
        >
          {/* Mobile-only top banner */}
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow"
                style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)" }}>
                <span className="text-sm font-black text-white">M</span>
              </div>
              <span className="text-sm font-bold text-slate-700">Mindaptix CRM</span>
            </div>
          </div>

          {/* Brand top (desktop) */}
          <div className="mb-5 hidden items-center gap-3 lg:flex">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)" }}
            >
              <span className="text-sm font-black text-white">M</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Initial Setup
              </p>
              <p className="text-sm font-bold text-slate-700">Mindaptix CRM</p>
            </div>
          </div>

          <h2 className="text-[1.6rem] font-black leading-snug text-gray-900">
            Create Super Admin 👑
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            First account gets full Super Admin privileges.
          </p>

          {/* Tab switcher */}
          <div
            className="mt-5 inline-flex gap-1 rounded-xl p-1"
            style={{ background: "rgba(13,61,90,0.07)", border: "1px solid rgba(13,61,90,0.1)" }}
          >
            <Link
              className="rounded-lg px-5 py-1.5 text-sm font-semibold text-slate-600 transition-all hover:bg-white/70"
              href="/login"
            >
              Login
            </Link>
            <span
              className="rounded-lg px-5 py-1.5 text-sm font-bold text-white shadow"
              style={{ background: "linear-gradient(135deg,#0d3d5a,#0e5a7a)" }}
            >
              Register
            </span>
          </div>

          <form action={formAction} autoComplete="off" className="mt-6 space-y-4">
            {state.error && <Feedback>{state.error}</Feedback>}

            {/* Super admin notice or closed notice */}
            {signupClosed ? (
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]"
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", color: "#92400e" }}>
                <span className="mt-0.5 shrink-0"><LockClosedIcon /></span>
                <span>Public signup is <strong>closed</strong>. Contact your Super Admin to create your account.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]"
                style={{ background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.2)", color: "#0a5c54" }}>
                <span className="mt-0.5 shrink-0 text-teal-600"><InfoIcon /></span>
                <span>You are creating the <strong>Super Admin</strong> account — the first &amp; most powerful user of this CRM.</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-500">Full Name</label>
              <IconInput
                icon={<UserIcon />}
                autoComplete="name"
                defaultValue={state.values?.fullName}
                disabled={signupClosed}
                name="fullName"
                placeholder="Your full name"
                required
                type="text"
              />
              {state.fieldErrors?.fullName && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-500">Email Address</label>
              <IconInput
                icon={<MailIcon />}
                autoCapitalize="none"
                autoCorrect="off"
                defaultValue={state.values?.email}
                disabled={signupClosed}
                name="email"
                placeholder="you@company.com"
                required
                spellCheck={false}
                type="email"
              />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-500">Password</label>
              <IconPasswordInput
                icon={<LockIcon />}
                disabled={signupClosed}
                name="password"
                placeholder="Min 8 chars, uppercase, number, symbol"
                required
              />
              {state.fieldErrors?.password && (
                <p className="mt-1 text-xs text-red-500">{state.fieldErrors.password}</p>
              )}
              {/* Password strength hint */}
              {!signupClosed && (
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Must contain uppercase, lowercase, number &amp; symbol.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              className="group relative mt-1 w-full overflow-hidden rounded-xl py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-60"
              style={{ background: signupClosed ? "#94a3b8" : "linear-gradient(135deg,#083450 0%,#0e7490 50%,#083450 100%)" }}
              disabled={pending || signupClosed}
              type="submit"
            >
              <span className="relative z-10">
                {signupClosed ? "Signup Closed" : pending ? "Creating Account…" : "Create Super Admin Account"}
              </span>
              {!signupClosed && (
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            <LockSmallIcon />
            <p className="text-center text-[12px] text-slate-400">
              Already have an account?{" "}
              <Link className="font-bold transition hover:opacity-70" style={{ color: "#0a7c6e" }} href="/login">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Trust badges — wraps on small screens */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <TrustBadge icon={<SslIcon />} label="SSL Secured" />
          <span className="hidden h-3 w-px bg-slate-300 sm:block" />
          <TrustBadge icon={<PrivacyIcon />} label="Privacy Protected" />
          <span className="hidden h-3 w-px bg-slate-300 sm:block" />
          <TrustBadge icon={<CloudIcon />} label="99.9% Uptime" />
        </div>
      </div>
    </div>
  );
}

/* ══ Input components ══ */

function IconInput({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [readOnly, setReadOnly] = React.useState(true);
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
      <span className="shrink-0 text-slate-400">{icon}</span>
      <input
        className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
        readOnly={readOnly}
        onFocus={() => setReadOnly(false)}
        autoComplete="off"
        {...props}
      />
    </div>
  );
}

function IconPasswordInput({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  const [readOnly, setReadOnly] = React.useState(true);
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
      <span className="shrink-0 text-slate-400">{icon}</span>
      <input
        className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
        type={show ? "text" : "password"}
        readOnly={readOnly}
        onFocus={() => setReadOnly(false)}
        autoComplete="new-password"
        {...props}
      />
      <button
        aria-label={show ? "Hide" : "Show"}
        className="shrink-0 text-slate-400 transition hover:text-slate-600 disabled:hidden"
        onClick={() => setShow(v => !v)}
        type="button"
        disabled={props.disabled}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

/* ══ Small pieces ══ */

function Step({ n, label, done = false }: { n: string; label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
        style={done
          ? { background: "rgba(13,148,136,0.25)", border: "1px solid rgba(45,212,191,0.4)", color: "#2dd4bf" }
          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }
        }
      >
        {done ? <CheckIcon /> : n}
      </div>
      <span className={`text-[13px] font-medium ${done ? "text-teal-300" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

function MiniCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="glass-card flex items-center gap-2 rounded-xl p-3">
      <span className="text-teal-400">{icon}</span>
      <span className="text-[11px] font-medium text-white/80">{label}</span>
    </div>
  );
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card flex items-center gap-2.5 rounded-2xl px-4 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.25)" }}>
        {icon}
      </div>
      <div className="leading-none">
        <p className="text-sm font-black text-white">{value}</p>
        <p className="text-[11px] text-teal-300/80">{label}</p>
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
    </div>
  );
}

/* ══ SVG Icons ══ */
function RocketIcon() {
  return <svg fill="none" height="16" stroke="#2dd4bf" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></svg>;
}
function CrownIcon() {
  return <svg fill="none" height="18" stroke="#2dd4bf" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M2 20h20M5 20l2-8 5 4 5-4 2 8" /><circle cx="12" cy="8" r="2" fill="#2dd4bf" /></svg>;
}
function ShieldCheckIcon() {
  return <svg fill="none" height="18" stroke="#2dd4bf" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>;
}
function CheckIcon() {
  return <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><polyline points="20 6 9 17 4 12" /></svg>;
}
function UsersManageIcon() {
  return <svg fill="none" height="13" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="13"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function SettingsIcon() {
  return <svg fill="none" height="13" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="13"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function RolesIcon() {
  return <svg fill="none" height="13" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function DataIcon() {
  return <svg fill="none" height="13" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="13"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
}
function UserIcon() {
  return <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function MailIcon() {
  return <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><rect height="16" rx="2" width="20" x="2" y="4" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}
function LockIcon() {
  return <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function LockClosedIcon() {
  return <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function LockSmallIcon() {
  return <svg fill="none" height="12" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" width="12"><rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function InfoIcon() {
  return <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>;
}
function EyeIcon() {
  return <svg fill="none" height="17" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="17"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOffIcon() {
  return <svg fill="none" height="17" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="17"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" x2="23" y1="1" y2="23" /></svg>;
}
function SslIcon() {
  return <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function PrivacyIcon() {
  return <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>;
}
function CloudIcon() {
  return <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>;
}
