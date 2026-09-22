"use client";
import { useActionState } from "react";
import { startEmployeeSession, endEmployeeSession } from "../impersonation-actions";
import type { AuthenticatedSession } from "../lib/auth-session";

export function EmployeeSessionSwitcher({ session, employees, placement = "content" }: { session: AuthenticatedSession; employees: { id: string; name: string }[]; placement?: "content" | "sidebar" }) {
  const [state, action, pending] = useActionState(startEmployeeSession, {});
  if (session.impersonator) return placement === "sidebar" ? <div className="mx-1 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-slate-800"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-700">Employee view</p><p className="mt-1 text-sm font-semibold">{session.user.fullName}</p><p className="mt-1 text-xs leading-5 text-slate-600">This view ends after 30 minutes.</p><form action={endEmployeeSession} className="mt-3"><button className="crm-primary w-full justify-center" type="submit">Return to Super Admin</button></form></div> : <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900"><p>Acting as <strong>{session.user.fullName}</strong> · Actions affect this employee’s account. Session ends after 30 minutes.</p><form action={endEmployeeSession}><button className="crm-primary">Return to Super Admin</button></form></div>;
  if (session.user.role !== "SUPER_ADMIN") return null;
  return <form action={action} className={placement === "sidebar" ? "mx-1 mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3" : "flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3"}>
    <label className="text-xs font-semibold text-slate-600" htmlFor="employee-session">Employee view</label>
    <select className={`crm-input mt-2 ${placement === "sidebar" ? "text-sm" : "max-w-64"}`} id="employee-session" name="employeeId" required defaultValue=""><option value="" disabled>Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
    <button className={`crm-primary mt-2 ${placement === "sidebar" ? "w-full justify-center" : ""}`} disabled={pending || employees.length === 0} type="submit">{pending ? "Switching…" : "Login as employee"}</button>
    {state.error && <p className="mt-2 text-xs text-red-700" role="alert">{state.error}</p>}
  </form>;
}
