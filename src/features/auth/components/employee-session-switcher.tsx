"use client";
import { useActionState } from "react";
import { startEmployeeSession, endEmployeeSession } from "../impersonation-actions";
import type { AuthenticatedSession } from "../lib/auth-session";

export function EmployeeSessionSwitcher({ session, employees }: { session: AuthenticatedSession; employees: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(startEmployeeSession, {});
  if (session.impersonator) return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900"><p>Acting as <strong>{session.user.fullName}</strong> · Actions affect this employee’s account. Session ends after 30 minutes.</p><form action={endEmployeeSession}><button className="crm-primary">Return to Super Admin</button></form></div>;
  if (session.user.role !== "SUPER_ADMIN") return null;
  return <form action={action} className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
    <label className="text-xs font-medium text-slate-500" htmlFor="employee-session">Employee view</label>
    <select className="crm-input max-w-64" id="employee-session" name="employeeId" required defaultValue=""><option value="" disabled>Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
    <button className="crm-primary" disabled={pending || employees.length === 0}>{pending ? "Switching…" : "Login as employee"}</button>
    {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
  </form>;
}
