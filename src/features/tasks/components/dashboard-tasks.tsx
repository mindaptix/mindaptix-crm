"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTaskDeadline, groupDashboardTasks, type DashboardTask } from "../deadline";

function countdown(milliseconds: number) {
  const seconds = Math.floor(Math.abs(milliseconds) / 1000);
  const days = Math.floor(seconds / 86400);
  return `${days ? `${days}d ` : ""}${String(Math.floor(seconds / 3600) % 24).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const GROUPS = [
  { key: "today", title: "Today’s tasks", tone: "bg-violet-50 text-violet-700 ring-violet-200", empty: "No tasks due today." },
  { key: "overdue", title: "Overdue tasks", tone: "bg-red-50 text-red-700 ring-red-200", empty: "You’re up to date. No overdue tasks." },
  { key: "upcoming", title: "Upcoming", tone: "bg-blue-50 text-blue-700 ring-blue-200", empty: "" },
  { key: "unscheduled", title: "No deadline", tone: "bg-slate-100 text-slate-600 ring-slate-200", empty: "" },
] as const;

export function DashboardTasks({ tasks }: { tasks: DashboardTask[] }) {
  const [now, setNow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 60_000);
    return () => { window.clearInterval(timer); window.clearInterval(refresh); };
  }, [router]);
  const groups = now === null ? null : groupDashboardTasks(tasks, now);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white font-sans text-sm shadow-sm [color-scheme:light] [&_h2]:font-sans [&_h3]:font-sans" aria-label="Your assigned tasks">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs text-slate-500">My workspace / Assigned to me</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">My tasks</h2>
        </div>
        <Link href="/dashboard/tasks" className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100">Manage tasks ↗</Link>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-500">Due today & overdue first · All deadlines in IST</span>
        <input aria-label="Search your tasks" type="search" placeholder="Search task…" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:w-60" />
      </div>
      {!groups ? <p className="p-5 text-slate-500" role="status">Loading your task deadlines…</p> : GROUPS.map((group) => {
        const allTasks = groups[group.key];
        if (!allTasks.length && (group.key === "upcoming" || group.key === "unscheduled")) return null;
        const rows = allTasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(search.trim().toLowerCase()));
        return (
          <section key={group.key} aria-label={group.title} className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center gap-2">
              <h3 className={`rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${group.tone}`}>{group.title}</h3>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">{allTasks.length}</span>
            </div>
            {rows.length === 0 ? <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">{search.trim() ? "No matching tasks in this section." : group.empty}</p> : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>{["Task", "Description", "Status", "Due date", "Priority", "Time remaining"].map((label) => <th key={label} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((task) => <TaskRow key={task.id} task={task} now={now!} overdue={group.key === "overdue"} />)}
                  </tbody>
                </table>
              </div>
            )}
            {group.key === "overdue" && allTasks.length > 0 && <p className="mt-2 text-xs text-red-600">Missed deadlines are included in your monthly report.</p>}
          </section>
        );
      })}
    </section>
  );
}

function TaskRow({ task, now, overdue }: { task: DashboardTask; now: number; overdue: boolean }) {
  const deadline = new Date(task.deadlineAt).getTime();
  const priorityTone = task.priority === "HIGH" ? "border-red-200 text-red-600" : task.priority === "MEDIUM" ? "border-teal-200 text-teal-700" : "border-slate-200 text-slate-500";
  const statusTone = task.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" : task.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600";
  return (
    <tr className="align-top transition-colors hover:bg-slate-50/70">
      <td className="min-w-44 px-3 py-3 font-medium text-slate-800"><Link href="/dashboard/tasks" className="hover:text-violet-700 hover:underline">{task.title}</Link></td>
      <td className="min-w-48 max-w-80 whitespace-pre-wrap break-words px-3 py-3 leading-5 text-slate-500">{task.description}</td>
      <td className="px-3 py-3"><span className={`inline-block whitespace-nowrap rounded px-2 py-1 text-xs ${statusTone}`}>{task.status.replaceAll("_", " ").toLowerCase()}</span></td>
      <td className="min-w-40 px-3 py-3 text-slate-600">{Number.isFinite(deadline) ? formatTaskDeadline(task.deadlineAt) : "Not set"}</td>
      <td className="px-3 py-3"><span className={`inline-block rounded border px-2 py-0.5 text-xs capitalize ${priorityTone}`}>{task.priority.toLowerCase()}</span></td>
      <td className={`min-w-36 px-3 py-3 tabular-nums ${overdue ? "text-red-600" : "text-violet-700"}`}><span role="timer" aria-live="off">{Number.isFinite(deadline) ? `${overdue ? "Late by " : ""}${countdown(deadline - now)}` : "—"}</span></td>
    </tr>
  );
}
