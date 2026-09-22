"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { loginUser } from "@/features/auth/actions";
import { INITIAL_AUTH_FORM_STATE } from "@/features/auth/lib/auth-form-state";

export function LoginScreen({ registered = false, signupClosed = false }: { registered?: boolean; signupClosed?: boolean }) {
  const [state, action, pending] = useActionState(loginUser, INITIAL_AUTH_FORM_STATE);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f7fb] text-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-5 sm:px-12">
        <Image src="/3.png" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-semibold tracking-tight">Mindaptix CRM</span>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-600">Your workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Log in to Mindaptix</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">One place for your projects, team and daily work.</p>
          <form action={action} className="mt-7 space-y-5">
            {registered && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Account created. Log in to continue.</p>}
            {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
            <label className="block text-sm font-medium">Work email
              <input className="crm-input mt-2" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={state.values?.email} placeholder="you@company.com" required aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} />
            </label>
            {state.fieldErrors?.email && <p id="email-error" className="text-xs text-red-700">{state.fieldErrors.email}</p>}
            <label className="block text-sm font-medium">Password
              <div className="relative mt-2">
                <input className="crm-input pr-16" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required aria-describedby={state.fieldErrors?.password ? "password-error" : undefined} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 text-xs font-medium text-slate-500">{showPassword ? "Hide" : "Show"}</button>
              </div>
            </label>
            {state.fieldErrors?.password && <p id="password-error" className="text-xs text-red-700">{state.fieldErrors.password}</p>}
            <Link className="block text-right text-sm font-medium text-violet-700 hover:underline" href="/forgot-password">Forgot password?</Link>
            <button className="crm-primary w-full justify-center py-3" disabled={pending} type="submit">{pending ? "Logging in…" : "Log in"}</button>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">
            {signupClosed ? "Need an account? Contact your Super Admin." : <Link href="/register" className="font-medium text-violet-700">Set up your workspace</Link>}
          </div>
        </section>
      </div>
      <footer className="pb-6 text-center text-xs text-slate-400">Mindaptix · Team workspace</footer>
    </main>
  );
}
