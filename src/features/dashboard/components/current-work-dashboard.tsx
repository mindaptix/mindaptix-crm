"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CurrentWork } from "@/features/dashboard/shared/current-work";
import { DashboardTasks } from "@/features/tasks/components/dashboard-tasks";
import { formatTaskDeadline } from "@/features/tasks/deadline";

const linkStyle = "font-medium text-blue-700 hover:underline";

export function CurrentWorkDashboard({ work }: { work: CurrentWork }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [router]);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const allTasks = work.people.flatMap((person) => person.tasks.map((task) => ({ ...task, employeeName: person.name })));
  const deadlineOrder = (task: { deadlineAt: string }) => task.deadlineAt ? new Date(task.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
  const deadlines = allTasks.filter((task) => task.deadlineAt).sort((a, b) => deadlineOrder(a) - deadlineOrder(b)).slice(0, 6);
  const people = work.people.filter((person) =>
    (!projectId || person.projects.some((project) => project.id === projectId)) &&
    [person.name, ...person.projects.map((project) => project.name), ...person.tasks.map((task) => task.title)].join(" ").toLowerCase().includes(query.toLowerCase().trim()),
  );
  return (
    <div className="space-y-6 px-3 pb-8 pt-3 sm:px-7 sm:pt-6">
      {work.assignedTasks.length > 0 && <DashboardTasks tasks={work.assignedTasks} />}
      <header className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-emerald-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">CEO workspace · {work.today}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Company delivery snapshot</h1><p className="mt-2 text-sm text-slate-600">The team&apos;s nearest deadlines, delivery risks and operating capacity.</p></div>
        <div className="flex gap-2"><Link href="/dashboard/reports" className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View reports</Link><Link href="/dashboard/tasks" className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Assign task</Link></div>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Projects in delivery", value: work.projects.length, detail: "Active projects with current owners", tone: "text-indigo-700", surface: "border-indigo-100 bg-indigo-50/70" }, { label: "Team available", value: `${work.insights.checkedIn}/${work.people.length}`, detail: `${work.insights.onLeave} on leave · ${work.insights.unchecked} not checked in`, tone: "text-emerald-700", surface: "border-emerald-100 bg-emerald-50/70" }, { label: "Work at risk", value: work.insights.overdueTasks.length, detail: "Overdue tasks that need a decision", tone: work.insights.overdueTasks.length ? "text-red-700" : "text-slate-900", surface: "border-rose-100 bg-rose-50/70" }, { label: "DSR follow-up", value: work.insights.missingDsrPeople.length, detail: "Checked-in employees without today’s DSR", tone: work.insights.missingDsrPeople.length ? "text-amber-700" : "text-slate-900", surface: "border-amber-100 bg-amber-50/70" }].map((metric) => <article key={metric.label} className={`rounded-xl border p-5 shadow-sm ${metric.surface}`}><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p><p className={`mt-3 text-3xl font-semibold tracking-tight ${metric.tone}`}>{metric.value}</p><p className="mt-2 text-xs leading-5 text-slate-600">{metric.detail}</p></article>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm" aria-label="Nearest team deadlines">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-violet-50/70 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-600">Delivery queue</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Nearest team deadlines</h2></div><Link href="/dashboard/tasks" className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">Open all tasks</Link></div>
        {deadlines.length ? <div className="grid gap-px bg-violet-100 md:grid-cols-2 xl:grid-cols-3">{deadlines.map((task) => { const overdue = task.deadlineAt < work.generatedAt; return <Link key={task.id} href="/dashboard/tasks" className="bg-white p-4 transition hover:bg-violet-50/50"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${task.priority === "HIGH" ? "bg-red-100 text-red-700" : task.priority === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{task.priority === "HIGH" ? "High priority" : task.priority}</span>{overdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-rose-700">Overdue</span>}</div><p className="mt-3 truncate text-sm font-semibold text-slate-900">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.employeeName}</p><p className={`mt-3 text-xs font-semibold ${overdue ? "text-rose-700" : "text-violet-700"}`}>{formatTaskDeadline(task.deadlineAt)}</p></Link>; })}</div> : <p className="p-5 text-sm text-slate-500">No open tasks have a deadline yet.</p>}
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <InsightPanel title="Delivery risks" href="/dashboard/tasks" empty="No overdue work right now.">{work.insights.overdueTasks.slice(0, 4).map((task) => <p key={task.id} className="text-sm text-slate-700"><span className="font-medium">{task.title}</span><span className="block text-xs text-slate-500">Due {formatTaskDeadline(task.deadlineAt)}</span></p>)}</InsightPanel>
        <InsightPanel title="Missing DSR follow-up" href="/dashboard/dsr" empty="All checked-in employees have submitted an update.">{work.insights.missingDsrPeople.slice(0, 4).map((person) => <Link key={person.id} href={`/dashboard/employees/${person.id}`} className="block text-sm font-medium text-slate-700 hover:text-indigo-700">{person.name}</Link>)}</InsightPanel>
        <InsightPanel title="Unassigned projects" href="/dashboard/projects" empty="Every ongoing project has an owner.">{work.insights.unassignedProjects.slice(0, 4).map((project) => <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block text-sm font-medium text-slate-700 hover:text-indigo-700">{project.name}</Link>)}</InsightPanel>
      </section>
      <section aria-labelledby="ongoing-projects" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 id="ongoing-projects" className="text-lg font-semibold">Ongoing projects <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-sm text-blue-700">{work.projects.length}</span></h2><Link href="/dashboard/portfolio" className={`text-sm ${linkStyle}`}>View portfolio →</Link></div>
        {work.projects.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No projects are currently in progress.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{work.projects.map((project) => <article key={project.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"><div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"/><div className="p-5">
          <div className="flex items-start gap-3"><ProjectIdentity name={project.name}/><div className="min-w-0 flex-1"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">In progress</span><h3 className="mt-2 text-lg font-semibold"><Link className="hover:text-blue-700" href={`/dashboard/projects/${project.id}`}>{project.name}</Link></h3></div></div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{project.summary || "No project description added."}</p>
          <div className="mt-4 flex flex-wrap gap-2">{project.people.length ? project.people.map((person) => <Link key={person.id} href={`/dashboard/employees/${person.id}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">{person.name}</Link>) : <span className="text-sm text-amber-700">No active employee assigned</span>}</div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Deadline: {project.dueDate || "Not set"}</p>
        </div></article>)}</div>}
      </section>
      <section aria-labelledby="employee-work" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-5"><div><h2 id="employee-work" className="text-lg font-semibold">Who is working on what?</h2><p className="mt-1 text-sm text-slate-500">Task statuses are employee-updated. Project-specific work appears in today’s DSR.</p></div>
          <div className="flex flex-wrap gap-3"><input aria-label="Search employees, projects or tasks" placeholder="Search employee, project or task…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter team by ongoing project" className="max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">All projects</option>{work.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        </div>
        <div className="divide-y divide-slate-100">{people.length === 0 ? <p className="p-6 text-sm text-slate-500">No employees match this view.</p> : people.map((person) => <article key={person.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(140px,0.7fr)_minmax(160px,1fr)_minmax(240px,1.6fr)_minmax(180px,1fr)]">
          <div><Link href={`/dashboard/employees/${person.id}`} className={`text-sm ${linkStyle}`}>{person.name}</Link><p className={`mt-2 text-xs font-medium ${person.presence === "Checked in" ? "text-emerald-700" : person.presence === "On leave" ? "text-amber-700" : "text-slate-500"}`}>{person.presence}</p></div>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned projects</p>{person.projects.length ? person.projects.map((project) => <p className="mb-2 text-sm" key={project.id}><Link className={linkStyle} href={`/dashboard/projects/${project.id}`}>{project.name}</Link><span className="block text-xs text-slate-500">{project.status.replaceAll("_", " ").toLowerCase()}</span></p>) : <p className="text-sm text-amber-700">No active project assigned</p>}</div>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Current tasks</p>{person.tasks.length ? person.tasks.map((task) => <div key={task.id} className="mb-3"><Link href="/dashboard/tasks" className="text-sm font-medium text-slate-800 hover:text-blue-700">{task.title}</Link><p className={`mt-1 text-xs ${task.status === "IN_PROGRESS" ? "text-blue-700" : "text-amber-700"}`}>{task.status.replaceAll("_", " ").toLowerCase()}</p><p className="mt-1 text-xs text-slate-500">{task.deadlineAt ? `Due ${formatTaskDeadline(task.deadlineAt)}` : "No deadline"}</p></div>) : <p className="text-sm text-slate-500">No open tasks</p>}</div>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Today’s DSR</p>{person.updates.length ? person.updates.map((update) => <div key={update.id} className="mb-3 text-sm"><p className="font-medium text-slate-700">{update.project}</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-500">{update.summary}</p></div>) : <p className="text-sm text-slate-500">No update submitted today</p>}</div>
        </article>)}</div>
      </section>
    </div>
  );
}

function ProjectIdentity({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const tones = ["from-indigo-600 to-blue-500", "from-violet-600 to-fuchsia-500", "from-emerald-600 to-teal-500", "from-amber-500 to-orange-500"];
  const tone = tones[name.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % tones.length];
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tone} text-sm font-bold text-white shadow-sm`}>{initials || "P"}</span>;
}

function InsightPanel({ children, empty, href, title }: { children: ReactNode; empty: string; href: string; title: string }) {
  const entries = Array.isArray(children) ? children : [children];
  const hasEntries = entries.some(Boolean);
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-900">{title}</h2><Link className="text-xs font-semibold text-indigo-600 hover:text-indigo-800" href={href}>Open</Link></div><div className="mt-4 space-y-3">{hasEntries ? children : <p className="text-sm leading-5 text-slate-500">{empty}</p>}</div></section>;
}
