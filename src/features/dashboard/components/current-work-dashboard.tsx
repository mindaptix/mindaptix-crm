"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const overdue = allTasks.filter((task) => task.deadlineAt && task.deadlineAt < work.generatedAt);
  const priorities = allTasks.filter((task) => task.priority === "HIGH" || (task.deadlineAt && task.deadlineAt < work.generatedAt)).sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt)).slice(0, 5);
  const people = work.people.filter((person) =>
    (!projectId || person.projects.some((project) => project.id === projectId)) &&
    [person.name, ...person.projects.map((project) => project.name), ...person.tasks.map((task) => task.title)].join(" ").toLowerCase().includes(query.toLowerCase().trim()),
  );
  return (
    <div className="space-y-6 px-3 pb-8 sm:px-7">
      {work.assignedTasks.length > 0 && <DashboardTasks tasks={work.assignedTasks} />}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Work overview · {work.today}</p><h1 className="mt-2 text-2xl font-semibold text-slate-950">Projects & team activity</h1><p className="mt-2 text-sm text-slate-500">Current assignments, task status and today’s reported work.</p></div>
        <Link href="/dashboard/tasks" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Assign task</Link>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: "Active work", value: allTasks.length, detail: "Open tasks across your team" }, { label: "Checked in", value: work.people.filter((person) => person.presence === "Checked in").length, detail: "Employees currently checked in" }, { label: "Overdue", value: overdue.length, detail: "Tasks requiring attention" }].map((metric) => <article key={metric.label} className="crm-surface p-5"><p className="text-sm font-medium text-slate-600">{metric.label}</p><p className={`mt-5 text-3xl font-semibold tracking-tight ${metric.label === "Overdue" && metric.value ? "text-red-600" : "text-slate-900"}`}>{metric.value}</p><p className="mt-2 text-xs text-slate-400">{metric.detail}</p></article>)}
      </div>
      <section className="crm-surface p-5" aria-label="Priority work">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Priority tasks</h2><Link href="/dashboard/tasks" className="text-xs font-medium text-violet-700">See all →</Link></div>
        {priorities.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{priorities.map((task) => <Link key={task.id} href="/dashboard/tasks" className="rounded-lg bg-violet-50/70 p-4"><p className="text-sm font-medium text-slate-800">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.employeeName}</p><p className="mt-3 text-xs text-violet-700">{task.deadlineAt ? formatTaskDeadline(task.deadlineAt) : "No deadline"}</p></Link>)}</div> : <p className="mt-4 text-sm text-slate-500">No high-priority or overdue work.</p>}
      </section>
      <section aria-labelledby="ongoing-projects" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 id="ongoing-projects" className="text-lg font-semibold">Ongoing projects <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-sm text-blue-700">{work.projects.length}</span></h2><Link href="/dashboard/portfolio" className={`text-sm ${linkStyle}`}>View portfolio →</Link></div>
        {work.projects.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No projects are currently in progress.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{work.projects.map((project) => <article key={project.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">In progress</span>
          <h3 className="mt-3 text-lg font-semibold"><Link className="hover:text-blue-700" href={`/dashboard/projects/${project.id}`}>{project.name}</Link></h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{project.summary || "No project description added."}</p>
          <div className="mt-4 flex flex-wrap gap-2">{project.people.length ? project.people.map((person) => <Link key={person.id} href={`/dashboard/employees/${person.id}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">{person.name}</Link>) : <span className="text-sm text-amber-700">No active employee assigned</span>}</div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Deadline: {project.dueDate || "Not set"}</p>
        </article>)}</div>}
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
