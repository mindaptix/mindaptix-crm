"use client";

import { useActionState } from "react";
import { requestLogout } from "@/features/auth/actions";

export function LogoutControl({ employeePolicy = false }: { employeePolicy?: boolean }) {
  const [state, action, pending] = useActionState(requestLogout, {});
  return <form action={action} className="space-y-3">
    {employeePolicy && <p className="text-xs text-blue-100/70">Daily policy: all tasks due today or earlier require Super Admin closure before normal logout. Submit completed work using Request closure from Super Admin.</p>}
    {state.error && <p role="alert" className="text-sm text-amber-200">{state.error}</p>}
    <button disabled={pending} type="submit" className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm text-white disabled:opacity-50">{pending ? "Checking…" : "Sign Out"}</button>
    {state.error && <button disabled={pending} type="submit" name="logoutAnyway" value="confirmed"
      onClick={(event) => { if (!window.confirm("Logout anyway? If assigned tasks still require Super Admin closure, one day's salary (monthly gross / 30) will be deducted for today. This deduction is recorded once per day. Confirm to continue.")) event.preventDefault(); }}
      className="w-full rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Logout anyway — forfeit today&apos;s salary</button>}
  </form>;
}
