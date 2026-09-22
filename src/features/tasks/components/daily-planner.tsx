"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTask } from "@/features/dashboard/actions/tasks";
import type { DailyPlan } from "../daily-plan";

export function DailyPlanner({ plan }: { plan: DailyPlan }) {
  const [state, action, pending] = useActionState(createTask, {});
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state, router]);
  return <section className="crm-surface p-5" aria-label="Plan today's work">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold">Plan today’s work</h2><p className="mt-1 text-sm text-slate-500">{plan.date} · {plan.assignedCount} assigned · {plan.selfCount}/2 self-created tasks</p></div>
      <span className={`rounded-md px-3 py-1 text-xs font-medium ${plan.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{plan.ready ? "Ready to check in" : "Work plan required"}</span>
    </div>
    <p className="mt-3 text-sm text-slate-600">Before check-in, have a task assigned for today or create at least two different tasks for yourself. Deadlines use IST; an empty time defaults to 11:59 PM.</p>
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-medium">Task title<input className="crm-input mt-1" name="title" required minLength={3} maxLength={160} placeholder="What will you work on?" /></label>
      <label className="text-xs font-medium">Description<input className="crm-input mt-1" name="description" required minLength={6} maxLength={1000} placeholder="Describe the expected result" /></label>
      <label className="text-xs font-medium">Deadline date<input className="crm-input mt-1" name="dueDate" type="date" min={plan.date} defaultValue={plan.date} required /></label>
      <label className="text-xs font-medium">Deadline time (IST)<input className="crm-input mt-1" name="dueTime" type="time" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="crm-primary" type="submit">{pending ? "Creating…" : "Create my task"}</button><Link className="text-sm font-medium text-violet-700" href="/dashboard/attendance">Open attendance →</Link></div>
      {state.error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p>}
    </form>
  </section>;
}
