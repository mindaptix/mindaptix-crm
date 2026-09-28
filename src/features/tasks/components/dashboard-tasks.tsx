"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTaskDeadline, groupDashboardTasks, type DashboardTask } from "../deadline";

function countdown(milliseconds: number) {
  const seconds = Math.floor(Math.abs(milliseconds) / 1000);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor(seconds / 3_600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  const remaining = `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return milliseconds < 0 ? `Late by ${remaining}` : remaining;
}

function deadlineTone(task: DashboardTask, now: number) {
  const deadline = new Date(task.deadlineAt).getTime();
  if (!Number.isFinite(deadline)) return "bg-slate-100 text-slate-600 ring-slate-200";
  if (deadline < now) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (deadline - now < 2 * 60 * 60 * 1000) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-violet-50 text-violet-700 ring-violet-200";
}

function priorityTone(priority: string) {
  if (priority === "HIGH") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (priority === "MEDIUM") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function DashboardTasks({ tasks }: { tasks: DashboardTask[] }) {
  const [now, setNow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    setNow(Date.now());
    const ticker = window.setInterval(() => setNow(Date.now()), 1_000);
    const refresher = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 60_000);
    return () => { window.clearInterval(ticker); window.clearInterval(refresher); };
  }, [router]);

  const groups = now === null ? null : groupDashboardTasks(tasks, now);
  const filtered = useMemo(() => {
    if (!groups) return null;
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query))])) as typeof groups;
  }, [groups, search]);
  const focusTasks = filtered ? [...filtered.overdue, ...filtered.today] : [];
  const nextTask = filtered?.today[0] ?? filtered?.upcoming[0] ?? null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]" aria-label="Your work for today">
      <header className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-violet-200">My workday</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Focus on what needs to move today</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-300">Deadlines update live in IST. Complete overdue work first, then move through today&apos;s planned tasks.</p>
          </div>
          <Link href="/dashboard/tasks" className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-violet-50">Open task board <span aria-hidden="true">→</span></Link>
        </div>
        {groups && (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Summary label="Due today" value={groups.today.length} detail="Tasks planned for today" tone="border-white/15 bg-white/10" />
            <Summary label="Overdue" value={groups.overdue.length} detail={groups.overdue.length ? "Needs attention now" : "Nothing pending"} tone={groups.overdue.length ? "border-rose-300/30 bg-rose-500/20" : "border-white/15 bg-white/10"} />
            <Summary label="Next deadline" value={nextTask ? countdown(new Date(nextTask.deadlineAt).getTime() - now!) : "—"} detail={nextTask?.title ?? "No upcoming deadline"} tone="border-violet-300/30 bg-violet-400/15" isTimer />
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Today&apos;s queue</span> <span className="mx-1 text-slate-300">·</span> timed deadlines shown in IST</p>
        <input aria-label="Search your tasks" type="search" placeholder="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:w-64" />
      </div>

      {!filtered ? <p className="p-6 text-sm text-slate-500" role="status">Loading task deadlines…</p> : (
        <div className="p-4 sm:p-5">
          {focusTasks.length > 0 ? (
            <div className="space-y-3">
              {filtered.overdue.length > 0 && <SectionHeading label="Overdue — resolve first" count={filtered.overdue.length} urgent />}
              {filtered.overdue.map((task) => <TaskFocusCard key={task.id} task={task} now={now!} />)}
              {filtered.overdue.length > 0 && filtered.today.length > 0 && <div className="my-5 border-t border-slate-200" />}
              {filtered.today.length > 0 && <SectionHeading label="Tasks due today" count={filtered.today.length} />}
              {filtered.today.map((task) => <TaskFocusCard key={task.id} task={task} now={now!} />)}
            </div>
          ) : <EmptyFocus searchActive={Boolean(search.trim())} />}

          {filtered.upcoming.length > 0 && <UpcomingTasks tasks={filtered.upcoming} now={now!} />}
          {filtered.unscheduled.length > 0 && <p className="mt-5 text-xs text-slate-500">{filtered.unscheduled.length} open task{filtered.unscheduled.length === 1 ? "" : "s"} without a deadline. View the task board to plan them.</p>}
        </div>
      )}
    </section>
  );
}

function Summary({ label, value, detail, tone, isTimer = false }: { label: string; value: string | number; detail: string; tone: string; isTimer?: boolean }) {
  return <div className={`rounded-xl border p-3.5 ${tone}`}><p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-300">{label}</p><p className={`mt-1.5 text-2xl font-semibold tracking-tight ${isTimer ? "tabular-nums" : ""}`}>{value}</p><p className="mt-1 truncate text-xs text-slate-300">{detail}</p></div>;
}

function SectionHeading({ label, count, urgent = false }: { label: string; count: number; urgent?: boolean }) {
  return <div className="flex items-center gap-2 pt-1"><h3 className={`text-sm font-semibold ${urgent ? "text-rose-700" : "text-slate-900"}`}>{label}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgent ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{count}</span></div>;
}

function TaskFocusCard({ task, now }: { task: DashboardTask; now: number }) {
  const deadline = new Date(task.deadlineAt).getTime();
  const status = task.status.replaceAll("_", " ").toLowerCase();
  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-[0_8px_24px_rgba(76,29,149,0.09)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide ring-1 ring-inset ${priorityTone(task.priority)}`}>{task.priority}</span>
            <span className="text-xs font-medium capitalize text-slate-500">{status}</span>
          </div>
          <Link href="/dashboard/tasks" className="mt-2 block text-base font-semibold text-slate-900 transition group-hover:text-violet-700">{task.title}</Link>
          {task.description && <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-600">{task.description}</p>}
          {task.assignedByName && <p className="mt-2 text-xs font-medium text-slate-500">{task.assignedBySelf ? "Created by" : "Assigned by"} <span className="text-violet-700">{task.assignedByName}</span></p>}
        </div>
        <div className="flex min-w-[168px] flex-col rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 lg:text-right">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Time remaining</span>
          <span className={`mt-1 text-lg font-semibold tabular-nums ring-1 ring-inset ${deadlineTone(task, now)} w-fit rounded-md px-2 py-0.5 lg:ml-auto`} role="timer" aria-live="off">{Number.isFinite(deadline) ? countdown(deadline - now) : "No deadline"}</span>
          <span className="mt-1.5 text-xs text-slate-500">{Number.isFinite(deadline) ? formatTaskDeadline(task.deadlineAt) : "Set a due time"}</span>
        </div>
      </div>
    </article>
  );
}

function UpcomingTasks({ tasks, now }: { tasks: DashboardTask[]; now: number }) {
  return <section className="mt-6 border-t border-slate-200 pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">Coming up</h3><Link href="/dashboard/tasks" className="text-xs font-semibold text-violet-700 hover:text-violet-900">View all</Link></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{tasks.slice(0, 3).map((task) => <Link href="/dashboard/tasks" key={task.id} className="rounded-lg border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50/40"><p className="truncate text-sm font-medium text-slate-900">{task.title}</p><p className="mt-2 text-xs tabular-nums text-slate-500">{Number.isFinite(new Date(task.deadlineAt).getTime()) ? countdown(new Date(task.deadlineAt).getTime() - now) : "No deadline"}</p></Link>)}</div></section>;
}

function EmptyFocus({ searchActive }: { searchActive: boolean }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center"><p className="text-sm font-semibold text-slate-800">{searchActive ? "No tasks match your search" : "No overdue or due-today tasks"}</p><p className="mt-1 text-sm text-slate-500">{searchActive ? "Try a different task name or keyword." : "You are clear for now. Review the upcoming queue below to plan ahead."}</p></div>;
}
