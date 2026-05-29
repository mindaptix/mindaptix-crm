"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markProjectClosedByEmployee } from "@/features/dashboard/actions/projects";
import { subscribeDashboardSync } from "@/features/dashboard/lib/live-sync";
import type { ProjectsPageData } from "@/features/dashboard/types";

type Props = { data: ProjectsPageData };

const STATUS_CONFIG: Record<string, { gradient: string; chipBg: string; chipText: string; dot: string; label: string }> = {
  PLANNING:    { gradient: "linear-gradient(135deg,#3b82f6,#6366f1)", chipBg: "rgba(99,102,241,0.1)",  chipText: "#4f46e5", dot: "#6366f1", label: "Planning" },
  IN_PROGRESS: { gradient: "linear-gradient(135deg,#10b981,#0d9488)", chipBg: "rgba(16,185,129,0.1)", chipText: "#059669", dot: "#10b981", label: "In Progress" },
  ON_HOLD:     { gradient: "linear-gradient(135deg,#f59e0b,#f97316)", chipBg: "rgba(245,158,11,0.1)",  chipText: "#d97706", dot: "#f59e0b", label: "On Hold" },
  COMPLETED:   { gradient: "linear-gradient(135deg,#64748b,#475569)", chipBg: "rgba(100,116,139,0.1)", chipText: "#475569", dot: "#64748b", label: "Completed" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  HIGH:   { bg: "rgba(239,68,68,0.08)",  text: "#dc2626", border: "rgba(239,68,68,0.2)" },
  MEDIUM: { bg: "rgba(245,158,11,0.08)", text: "#d97706", border: "rgba(245,158,11,0.2)" },
  LOW:    { bg: "rgba(100,116,139,0.08)",text: "#475569", border: "rgba(100,116,139,0.2)" },
};

const STATUS_FILTERS = ["ALL", "PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED"] as const;

export function EmployeeProjectsPanel({ data }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");

  // Auto-refresh when admin assigns a new project (same-browser BroadcastChannel)
  useEffect(() => {
    return subscribeDashboardSync(() => {
      router.refresh();
    });
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.projects.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.name, p.summary, p.status, p.priority, ...p.techStack].join(" ").toLowerCase().includes(q);
    });
  }, [data.projects, search, statusFilter]);

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {data.summaryCards.map((card, i) => {
          const gradients = [
            "linear-gradient(135deg,#6366f1,#818cf8)",
            "linear-gradient(135deg,#10b981,#34d399)",
            "linear-gradient(135deg,#64748b,#94a3b8)",
          ];
          const shadows = [
            "0 8px 24px rgba(99,102,241,0.28)",
            "0 8px 24px rgba(16,185,129,0.28)",
            "0 8px 24px rgba(100,116,139,0.2)",
          ];
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-[1.5rem] p-5 text-white"
              style={{ background: gradients[i % 3], boxShadow: shadows[i % 3] }}
            >
              <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-white/75">{card.label}</p>
              <p className="mt-2 text-4xl font-black text-white">{card.value}</p>
              <p className="mt-1.5 text-[0.72rem] text-white/65">{card.detail}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main panel ── */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.08)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>My Assignments</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800">My Projects</h2>
          <p className="mt-1 text-sm text-slate-500">Projects you have been assigned to by your manager or admin.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          {/* Search */}
          <div className="relative flex min-w-[200px] flex-1 items-center">
            <span className="pointer-events-none absolute left-3.5 text-slate-400">
              <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 placeholder:text-slate-400"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                className="rounded-full px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider transition-all"
                style={
                  statusFilter === f
                    ? { background: "#6366f1", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }
                    : { background: "rgba(99,102,241,0.07)", color: "#6366f1" }
                }
                onClick={() => setStatusFilter(f)}
                type="button"
              >
                {f === "ALL" ? "All" : f === "IN_PROGRESS" ? "In Progress" : f.charAt(0) + f.slice(1).toLowerCase().replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Project grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}
            >
              📂
            </div>
            <p className="text-base font-bold text-slate-600">
              {data.projects.length === 0 ? "No projects assigned yet" : "No projects match your filter"}
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-slate-400">
              {data.projects.length === 0
                ? "Your manager will assign projects to you. They'll appear here automatically."
                : "Try adjusting your search or status filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectsPageData["projects"][number] }) {
  const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PLANNING;
  const pc = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.LOW;
  const isOverdue = project.dueDate && project.dueDate !== "—" && new Date(project.dueDate) < new Date() && project.status !== "COMPLETED";
  const [confirmClose, setConfirmClose] = useState(false);
  const [closeState, closeAction, closePending] = useActionState(markProjectClosedByEmployee, {});

  const isClosedByEmployee = Boolean(project.closedByEmployeeId);
  const isCompleted = project.status === "COMPLETED";

  useEffect(() => {
    if (closeState.success) setConfirmClose(false);
  }, [closeState.success]);

  return (
    <article
      className="group relative overflow-hidden rounded-[1.4rem] p-5 transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{ border: "1px solid rgba(226,232,240,0.9)", background: "#fff", boxShadow: "0 4px 20px rgba(15,23,42,0.06)" }}
    >
      {/* Colored top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-[1.4rem]" style={{ background: isClosedByEmployee ? "linear-gradient(135deg,#7c3aed,#a78bfa)" : sc.gradient }} />

      {/* Header: name + status chip */}
      <div className="mt-1 flex items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-snug text-slate-800 transition-colors group-hover:text-indigo-700">
          {project.name}
        </h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {isClosedByEmployee ? (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(124,58,237,0.1)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-violet-700">Closed by You</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: sc.chipBg }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />
              <span className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: sc.chipText }}>{sc.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="mt-2.5 line-clamp-2 text-[0.82rem] leading-5 text-slate-500">{project.summary}</p>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
          style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}
        >
          {project.priority}
        </span>

        {project.dueDate && project.dueDate !== "—" && (
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold"
            style={
              isOverdue
                ? { background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }
                : { background: "rgba(99,102,241,0.07)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.15)" }
            }
          >
            <svg fill="none" height="10" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="10">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            {isOverdue ? "Overdue · " : ""}{project.dueDate}
          </span>
        )}

        {isClosedByEmployee && project.closedByEmployeeAt && project.closedByEmployeeAt !== "—" ? (
          <span className="rounded-full px-2.5 py-1 text-[0.6rem] font-semibold" style={{ background: "rgba(124,58,237,0.07)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.15)" }}>
            Closed {project.closedByEmployeeAt}
          </span>
        ) : null}
      </div>

      {/* Tech stack */}
      {project.techStack.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {project.techStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="rounded-lg px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wider"
              style={{ background: "rgba(99,102,241,0.07)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.12)" }}
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="rounded-lg px-2 py-0.5 text-[0.58rem] font-semibold text-slate-400" style={{ background: "#f1f5f9" }}>
              +{project.techStack.length - 4}
            </span>
          )}
        </div>
      )}

      {/* ── Mark as Closed section ── */}
      {!isClosedByEmployee && !isCompleted ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {closeState.error ? (
            <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.72rem] font-semibold text-rose-600">{closeState.error}</p>
          ) : null}

          {!confirmClose ? (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-2 text-[0.72rem] font-bold uppercase tracking-wider text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              onClick={() => setConfirmClose(true)}
              type="button"
            >
              <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
              Mark as Closed
            </button>
          ) : (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-[0.72rem] font-semibold text-violet-900">Mark this project as closed?</p>
              <p className="mt-0.5 text-[0.68rem] text-violet-600">This will set the status to Completed. Admin will be notified.</p>
              <div className="mt-2.5 flex gap-2">
                <form action={closeAction} className="flex-1">
                  <input name="projectId" type="hidden" value={project.id} />
                  <button
                    className="w-full rounded-lg bg-violet-600 py-1.5 text-[0.72rem] font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
                    disabled={closePending}
                    type="submit"
                  >
                    {closePending ? "Closing…" : "Yes, Close It"}
                  </button>
                </form>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-slate-500 transition hover:bg-slate-50"
                  onClick={() => setConfirmClose(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isClosedByEmployee ? (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <svg className="shrink-0 text-violet-500" fill="none" height="14" viewBox="0 0 24 24" width="14">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
          <p className="text-[0.72rem] font-semibold text-violet-700">You have reported this project as closed</p>
        </div>
      ) : isCompleted ? (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          <svg className="shrink-0 text-emerald-500" fill="none" height="14" viewBox="0 0 24 24" width="14">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
          <p className="text-[0.72rem] font-semibold text-emerald-700">Project marked complete by admin</p>
        </div>
      ) : null}
    </article>
  );
}
