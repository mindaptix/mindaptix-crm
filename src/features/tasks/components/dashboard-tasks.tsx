"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTaskDeadline, type DashboardTask } from "../deadline";

function countdown(milliseconds: number) {
  const seconds = Math.floor(Math.abs(milliseconds) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function DashboardTasks({ tasks }: { tasks: DashboardTask[] }) {
  const [now, setNow] = useState<number | null>(null);
  const router = useRouter();
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 60_000);
    return () => { window.clearInterval(timer); window.clearInterval(refresh); };
  }, [router]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6" aria-label="Your assigned tasks">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tasks to complete ({tasks.length})</h2>
          <p className="text-sm text-slate-500">Your assigned work, ordered by deadline. All deadlines are in IST.</p>
        </div>
        <Link href="/dashboard/tasks" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Open tasks</Link>
      </div>
      {tasks.length === 0 ? <p className="text-sm text-slate-500">No pending tasks. You are up to date.</p> : (
        <div className="grid max-h-[28rem] gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => {
            const deadline = task.deadlineAt ? new Date(task.deadlineAt).getTime() : NaN;
            const remaining = now !== null && Number.isFinite(deadline) ? deadline - now : null;
            const overdue = remaining !== null && remaining < 0;
            return (
              <article key={task.id} className={`rounded-lg border p-4 ${overdue ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="break-words font-semibold text-slate-900">{task.title}</h3>
                  <span className="text-xs font-semibold text-slate-600">{task.priority}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{task.status.replaceAll("_", " ")}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{task.description}</p>
                <p className="mt-3 text-xs text-slate-500">Due: {task.deadlineAt ? formatTaskDeadline(task.deadlineAt) : "Not specified"}</p>
                <p role="timer" aria-live="off" className={`mt-2 font-mono text-lg font-semibold tabular-nums ${overdue ? "text-red-700" : "text-blue-700"}`}>
                  {remaining === null ? "—" : `${overdue ? "Overdue by" : "Time left"} ${countdown(remaining)}`}
                </p>
                {overdue && <p className="mt-1 text-xs text-red-700">Deadline missed · included in your monthly report.</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
