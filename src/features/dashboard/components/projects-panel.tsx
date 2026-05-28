"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createManagedProject, deleteManagedProject, updateManagedProject } from "@/features/dashboard/actions/projects";
import { emitDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import type { ProjectsPageData } from "@/features/dashboard/types";
import type { ProjectPriority, ProjectStatus } from "@/database/mongodb/models/project";

type ProjectsPanelProps = {
  data: ProjectsPageData;
};

type ProjectFormState = {
  error?: string;
  success?: string;
  values?: {
    assignedUserIds?: string[];
    id?: string;
    name?: string;
    summary?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    dueDate?: string;
    techStack?: string[];
    clientName?: string;
    clientBudget?: string;
  };
};

const INITIAL_PROJECT_STATE: ProjectFormState = {};

type CreateDraft = {
  name?: string;
  summary?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  techStack?: string[];
  assignedUserIds?: string[];
  clientName?: string;
  clientBudget?: string;
};

const STATUS_STYLES: Record<string, { card: string; chip: string; dot: string; label: string }> = {
  PLANNING:    { card: "border-blue-200/70",   chip: "border-blue-100 bg-blue-50 text-blue-700",     dot: "bg-blue-400",    label: "Planning" },
  IN_PROGRESS: { card: "border-emerald-200/70", chip: "border-emerald-100 bg-emerald-50 text-emerald-700", dot: "bg-emerald-400 animate-pulse", label: "In Progress" },
  ON_HOLD:     { card: "border-amber-200/70",   chip: "border-amber-100 bg-amber-50 text-amber-700",   dot: "bg-amber-400",   label: "On Hold" },
  COMPLETED:   { card: "border-slate-200",      chip: "border-slate-100 bg-slate-50 text-slate-600",   dot: "bg-slate-400",   label: "Completed" },
};


const STATUS_FILTERS = ["ALL", "PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED_BY_EMP"] as const;

export function ProjectsPanel({ data }: ProjectsPanelProps) {
  const [createState, createProjectAction, createPending] = useActionState(createManagedProject, INITIAL_PROJECT_STATE);
  const [updateState, updateProjectAction, updatePending] = useActionState(updateManagedProject, INITIAL_PROJECT_STATE);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>({});
  const [lastUpdateSuccess, setLastUpdateSuccess] = useState<string | null>(null);

  const employeeLabels = useMemo(
    () => Object.fromEntries(data.employeeOptions.map((e) => [e.id, e.label])),
    [data.employeeOptions],
  );

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.projects.filter((project) => {
      if (statusFilter === "CLOSED_BY_EMP") {
        if (!project.closedByEmployeeId) return false;
      } else if (statusFilter !== "ALL" && project.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return [project.name, project.summary, project.status, project.priority, project.dueDate, ...project.techStack, ...project.assignedUserNames]
        .join(" ").toLowerCase().includes(query);
    });
  }, [data.projects, searchTerm, statusFilter]);

  const selectedProject = selectedProjectId
    ? data.projects.find((p) => p.id === selectedProjectId) ?? null
    : null;

  const inProgress      = data.projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completed       = data.projects.filter((p) => p.status === "COMPLETED").length;
  const highPri         = data.projects.filter((p) => p.priority === "HIGH").length;
  const closedByEmp     = data.projects.filter((p) => p.closedByEmployeeId).length;

  useEffect(() => {
    if (createState.success) {
      emitDashboardSync("project-created");
      setCreateDraft({});
      setIsCreateOpen(false);
    }
  }, [createState.success]);

  useEffect(() => {
    if (updateState.success) emitDashboardSync("project-updated");
  }, [updateState.success]);

  useEffect(() => {
    if (!updateState.success || updateState.success === lastUpdateSuccess) return;
    setLastUpdateSuccess(updateState.success);
    const t = window.setTimeout(() => setSelectedProjectId(null), 600);
    return () => window.clearTimeout(t);
  }, [lastUpdateSuccess, updateState.success]);

  return (
    <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">

      {/* ── Header gradient card ── */}
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1e3a5f_52%,#0f4c81_100%)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/50">Project Portfolio</p>
            <h1 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">Projects</h1>
            <p className="mt-1.5 text-sm text-white/60">Track project status, team assignments, and delivery timelines.</p>
          </div>
          <button
            className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            onClick={() => setIsCreateOpen(true)}
            type="button"
          >
            + New Project
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatPill label="Total" value={String(data.projects.length)} color="blue" />
          <StatPill label="In Progress" value={String(inProgress)} color="emerald" pulse />
          <StatPill label="Completed" value={String(completed)} color="slate" />
          <StatPill label="High Priority" value={String(highPri)} color="rose" />
          <StatPill label="Closed by Employee" value={String(closedByEmp)} color="violet" />
        </div>
      </section>

      {/* ── Employee-closed alert ── */}
      {closedByEmp > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-[linear-gradient(135deg,#f5f3ff_0%,#ede9fe_100%)] px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-violet-900">
              {closedByEmp} project{closedByEmp !== 1 ? "s" : ""} closed by employee{closedByEmp !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-violet-600">Employees have self-reported these projects as completed. Review them below.</p>
          </div>
          <button
            className="shrink-0 rounded-xl border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
            onClick={() => setStatusFilter("CLOSED_BY_EMP")}
            type="button"
          >
            View All
          </button>
        </div>
      ) : null}

      {/* ── Toolbar: search + status filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" height="16" viewBox="0 0 24 24" width="16">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, tech, employee, status..."
            value={searchTerm}
          />
        </div>
        <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${statusFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              key={f}
              onClick={() => setStatusFilter(f)}
              type="button"
            >
              {f === "ALL" ? "All" : f === "CLOSED_BY_EMP" ? "Employee Closed" : STATUS_STYLES[f]?.label ?? f}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-400">{filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Project cards grid ── */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl shadow-inner">📁</div>
          <p className="text-base font-semibold text-slate-600">No projects match your filter</p>
          <p className="mt-1.5 text-sm text-slate-400">Try clearing the search or selecting a different status.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const s = STATUS_STYLES[project.status] ?? STATUS_STYLES.PLANNING;
            const overdue = project.dueDate ? project.dueDate < getTodayDate() && project.status !== "COMPLETED" : false;
            const cardGradient =
              project.closedByEmployeeId
                ? "linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#c4b5fd 100%)"
                : project.status === "IN_PROGRESS"
                  ? "linear-gradient(135deg,#064e3b 0%,#059669 60%,#a7f3d0 100%)"
                  : project.status === "ON_HOLD"
                    ? "linear-gradient(135deg,#78350f 0%,#d97706 62%,#fde68a 100%)"
                    : project.status === "COMPLETED"
                      ? "linear-gradient(135deg,#1e293b 0%,#475569 62%,#cbd5e1 100%)"
                      : "linear-gradient(135deg,#1e3a8a 0%,#2563eb 62%,#bfdbfe 100%)";

            const avatarGradients = [
              "from-blue-500 to-indigo-600",
              "from-emerald-500 to-teal-600",
              "from-rose-500 to-pink-600",
              "from-amber-500 to-orange-600",
              "from-violet-500 to-purple-600",
            ];

            return (
              <article
                className="group flex flex-col overflow-hidden rounded-[1.8rem] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.14)]"
                key={project.id}
                style={{ border: "1px solid rgba(226,232,240,0.7)" }}
              >
                {/* ── Gradient card header ── */}
                <div
                  className="relative overflow-hidden px-5 pb-4 pt-5"
                  style={{ background: cardGradient }}
                >
                  {/* Decorative circle */}
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-4 right-8 h-14 w-14 rounded-full bg-white/8" />

                  {/* Status + Priority + Closed badge */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      <span className={`h-1.5 w-1.5 rounded-full bg-white ${project.status === "IN_PROGRESS" ? "animate-pulse" : ""}`} />
                      {s.label}
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                      {project.priority}
                    </span>
                    {project.closedByEmployeeId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white">
                        ✓ Closed by Employee
                      </span>
                    ) : null}
                    {overdue ? (
                      <span className="rounded-full border border-rose-300/40 bg-rose-500/30 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white">
                        ⚠ Overdue
                      </span>
                    ) : null}
                  </div>

                  {/* Project name */}
                  <h3 className="mt-3 text-[1.05rem] font-bold leading-snug text-white drop-shadow-sm">
                    {project.name}
                  </h3>

                  {/* Team avatar row in header */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {project.assignedUserNames.length === 0 ? (
                        <span className="text-[0.65rem] font-semibold text-white/60">No team assigned</span>
                      ) : (
                        <>
                          {project.assignedUserNames.slice(0, 5).map((name, i) => (
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/30 bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-[0.55rem] font-bold text-white shadow-md`}
                              key={`${project.id}-av-${i}`}
                              title={name}
                            >
                              {name.trim().charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {project.assignedUserNames.length > 5 ? (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-[0.55rem] font-bold text-white">
                              +{project.assignedUserNames.length - 5}
                            </div>
                          ) : null}
                          <span className="ml-2 self-center text-[0.62rem] font-semibold text-white/70">
                            {project.assignedUserNames.length} member{project.assignedUserNames.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Card body ── */}
                <div className="flex flex-1 flex-col px-5 py-4">
                  {/* Summary */}
                  <p className="line-clamp-2 text-[0.82rem] leading-5 text-slate-500">
                    {project.summary || "No description added."}
                  </p>

                  {/* Tech stack */}
                  {project.techStack.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <span
                          className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-600"
                          key={tech}
                        >
                          {tech}
                        </span>
                      ))}
                      {project.techStack.length > 4 ? (
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-[0.6rem] font-semibold text-slate-400">
                          +{project.techStack.length - 4} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {project.closedByEmployeeId && project.closedByEmployeeAt ? (
                        <span className="flex items-center gap-1 text-violet-600">
                          <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                          </svg>
                          Closed {project.closedByEmployeeAt}
                        </span>
                      ) : project.dueDate ? (
                        <span className={`flex items-center gap-1 ${overdue ? "text-rose-500" : "text-slate-400"}`}>
                          <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                            <rect height="18" rx="2" width="18" x="3" y="4" stroke="currentColor" strokeWidth="1.8" />
                            <line stroke="currentColor" strokeWidth="1.8" x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                          {overdue ? "⚠ Overdue · " : "Due "}
                          {project.dueDate}
                        </span>
                      ) : (
                        <span className="text-slate-300">No due date</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                        href={`/dashboard/projects/${project.id}`}
                      >
                        View Details
                      </Link>
                      <button
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => setSelectedProjectId(project.id)}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Edit modal ── */}
      {selectedProject ? (
        <EditModal
          employeeLabels={employeeLabels}
          employeeOptions={data.employeeOptions}
          onClose={() => setSelectedProjectId(null)}
          project={selectedProject}
          technologyOptions={data.technologyOptions}
          updatePending={updatePending}
          updateProjectAction={updateProjectAction}
          updateState={updateState}
          deleteManagedProject={deleteManagedProject}
        />
      ) : null}

      {/* ── Create modal ── */}
      {isCreateOpen ? (
        <CreateModal
          createPending={createPending}
          createProjectAction={createProjectAction}
          createState={createState}
          draft={createDraft}
          employeeLabels={employeeLabels}
          employeeOptions={data.employeeOptions}
          onClose={() => setIsCreateOpen(false)}
          onSaveDraft={setCreateDraft}
          technologyOptions={data.technologyOptions}
        />
      ) : null}
    </div>
  );
}

/* ─── Edit Modal ─── */
function EditModal({
  deleteManagedProject: deleteAction,
  employeeLabels,
  employeeOptions,
  onClose,
  project,
  technologyOptions,
  updatePending,
  updateProjectAction,
  updateState,
}: {
  deleteManagedProject: (fd: FormData) => void;
  employeeLabels: Record<string, string>;
  employeeOptions: { id: string; label: string; role?: string }[];
  onClose: () => void;
  project: ProjectsPageData["projects"][number];
  technologyOptions: string[];
  updatePending: boolean;
  updateProjectAction: (fd: FormData) => void;
  updateState: ProjectFormState;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const s = STATUS_STYLES[project.status] ?? STATUS_STYLES.PLANNING;
  const gradientClass =
    project.status === "IN_PROGRESS" ? "bg-[linear-gradient(135deg,#064e3b_0%,#059669_60%,#d1fae5_100%)]"
    : project.status === "ON_HOLD" ? "bg-[linear-gradient(135deg,#78350f_0%,#d97706_60%,#fef3c7_100%)]"
    : project.status === "COMPLETED" ? "bg-[linear-gradient(135deg,#1e293b_0%,#334155_60%,#e2e8f0_100%)]"
    : "bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_60%,#dbeafe_100%)]";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className={`relative shrink-0 overflow-hidden px-6 pb-5 pt-6 ${gradientClass}`}>
          {/* Top-right action buttons: Delete + Close */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {/* Delete icon button */}
            {confirmDel ? (
              <div className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/30 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-[0.65rem] font-semibold text-white/90">Delete project?</span>
                <form action={deleteAction}>
                  <input name="projectId" type="hidden" value={project.id} />
                  <button
                    className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[0.6rem] font-bold text-white hover:bg-rose-600 transition"
                    type="submit"
                  >
                    Yes
                  </button>
                </form>
                <button
                  className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.6rem] font-bold text-white hover:bg-white/30 transition"
                  onClick={() => setConfirmDel(false)}
                  type="button"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                aria-label="Delete project"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-rose-500/70"
                onClick={() => setConfirmDel(true)}
                title="Delete project"
                type="button"
              >
                <svg fill="none" height="15" viewBox="0 0 24 24" width="15">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            )}
            {/* Close button */}
            <button
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              onClick={onClose}
              type="button"
            >
              <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                <rect height="14" rx="2" stroke="white" strokeWidth="1.8" width="18" x="3" y="5" />
                <path d="M3 9h18M9 5v4M15 5v4M7 13h4M7 16.5h6" stroke="white" strokeLinecap="round" strokeWidth="1.6" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/70">Editing Project</p>
              <h4 className="mt-0.5 truncate text-xl font-semibold text-white">{project.name}</h4>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                </span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/60">{project.priority} priority</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {updateState.error ? <div className="px-6 pt-4"><Feedback>{updateState.error}</Feedback></div> : null}
          {updateState.success ? <div className="px-6 pt-4"><Feedback tone="success">{updateState.success}</Feedback></div> : null}

          <form action={updateProjectAction} className="space-y-4 px-6 py-5">
            <input name="projectId" type="hidden" value={project.id} />

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field defaultValue={project.name} label="Project Name" name="name" placeholder="Enter project name" />
              <Field defaultValue={project.dueDate} fallbackTodayForDate label="Due Date" name="dueDate" placeholder="" type="date" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field defaultValue={project.clientName} label="Client / Company Name" name="clientName" placeholder="e.g. Acme Corp" required={false} />
              <Field defaultValue={String(project.clientBudget > 0 ? project.clientBudget : "")} label="Project Budget (₹)" name="clientBudget" placeholder="e.g. 150000" type="number" required={false} />
            </div>

            <TextAreaField defaultValue={project.summary} label="Project Summary" name="summary" placeholder="Describe the project scope and goals" />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                defaultValue={project.status}
                label="Status"
                labels={{ PLANNING: "Planning", IN_PROGRESS: "In Progress", ON_HOLD: "On Hold", COMPLETED: "Completed" }}
                name="status"
                options={["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]}
              />
              <SelectField
                defaultValue={project.priority}
                label="Priority"
                labels={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }}
                name="priority"
                options={["LOW", "MEDIUM", "HIGH"]}
              />
            </div>

            <MultiSelect
              defaultValue={project.techStack}
              key={`edit-tech-${project.id}`}
              label="Tech Stack"
              name="techStack"
              optionLabels={Object.fromEntries(technologyOptions.map((o) => [o, o]))}
              options={technologyOptions}
              placeholder="Select technologies"
            />

            <MultiSelect
              defaultValue={project.assignedUserIds}
              key={`edit-emp-${project.id}`}
              label="Assigned Team Members"
              name="assignedUserIds"
              optionLabels={employeeLabels}
              optionRoles={Object.fromEntries(employeeOptions.map((e) => [e.id, e.role ?? "EMPLOYEE"]))}
              options={employeeOptions.map((e) => e.id)}
              placeholder="Assign team members"
            />

            <button
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(29,78,216,0.3)] transition hover:opacity-90 disabled:opacity-60"
              disabled={updatePending}
              type="submit"
            >
              {updatePending ? "Saving Changes…" : "Save Changes"}
            </button>
          </form>
        </div>

      </div>
    </div>,
    document.body,
  );
}

/* ─── Create Modal ─── */
function CreateModal({
  createPending,
  createProjectAction,
  createState,
  draft,
  employeeLabels,
  employeeOptions,
  onClose,
  onSaveDraft,
  technologyOptions,
}: {
  createPending: boolean;
  createProjectAction: (fd: FormData) => void;
  createState: ProjectFormState;
  draft: CreateDraft;
  employeeLabels: Record<string, string>;
  employeeOptions: { id: string; label: string; role?: string }[];
  onClose: () => void;
  onSaveDraft: (d: CreateDraft) => void;
  technologyOptions: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    if (formRef.current) {
      const fd = new FormData(formRef.current);
      onSaveDraft({
        name: (fd.get("name") as string) || undefined,
        summary: (fd.get("summary") as string) || undefined,
        status: (fd.get("status") as string) || undefined,
        priority: (fd.get("priority") as string) || undefined,
        dueDate: (fd.get("dueDate") as string) || undefined,
        techStack: ((fd.get("techStackCsv") as string) || "").split(",").filter(Boolean),
        assignedUserIds: ((fd.get("assignedUserIdsCsv") as string) || "").split(",").filter(Boolean),
      });
    }
    onClose();
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
    >
      <div
        className="flex h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-6 pb-5 pt-6">
          <button
            aria-label="Close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            onClick={handleClose}
            type="button"
          >
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.1rem] bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                <path d="M12 5v14M5 12h14" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/70">New Project</p>
              <h4 className="mt-0.5 text-xl font-semibold text-white">Create Project</h4>
              <p className="mt-0.5 text-sm text-white/60">Fill in the details to get started</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <form action={createProjectAction} className="space-y-4 px-6 py-5" ref={formRef}>
            {createState.error ? <Feedback>{createState.error}</Feedback> : null}
            {createState.success ? <Feedback tone="success">{createState.success}</Feedback> : null}

            <Field defaultValue={createState.values?.name ?? draft.name} label="Project Name" name="name" placeholder="Enter project name" />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field defaultValue={createState.values?.clientName ?? draft.clientName} label="Client / Company Name" name="clientName" placeholder="e.g. Acme Corp" required={false} />
              <Field defaultValue={createState.values?.clientBudget ?? draft.clientBudget} label="Project Budget (₹)" name="clientBudget" placeholder="e.g. 150000" type="number" required={false} />
            </div>

            <TextAreaField defaultValue={createState.values?.summary ?? draft.summary} label="Project Summary" name="summary" placeholder="Describe the project scope and goals" />

            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField
                defaultValue={createState.values?.status ?? draft.status ?? "PLANNING"}
                label="Status"
                labels={{ PLANNING: "Planning", IN_PROGRESS: "In Progress", ON_HOLD: "On Hold", COMPLETED: "Completed" }}
                name="status"
                options={["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]}
              />
              <SelectField
                defaultValue={createState.values?.priority ?? draft.priority ?? "MEDIUM"}
                label="Priority"
                labels={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }}
                name="priority"
                options={["LOW", "MEDIUM", "HIGH"]}
              />
              <Field
                defaultValue={createState.values?.dueDate ?? draft.dueDate}
                fallbackTodayForDate
                label="Due Date"
                name="dueDate"
                placeholder=""
                type="date"
              />
            </div>

            <MultiSelect
              defaultValue={createState.values?.techStack ?? draft.techStack ?? []}
              key={`create-tech-${(createState.values?.techStack ?? draft.techStack ?? []).join(",")}`}
              label="Tech Stack"
              name="techStack"
              optionLabels={Object.fromEntries(technologyOptions.map((o) => [o, o]))}
              options={technologyOptions}
              placeholder="Select technologies"
            />

            <MultiSelect
              defaultValue={createState.values?.assignedUserIds ?? draft.assignedUserIds ?? []}
              key={`create-emp-${(createState.values?.assignedUserIds ?? draft.assignedUserIds ?? []).join(",")}`}
              label="Assign Team Members"
              name="assignedUserIds"
              optionLabels={employeeLabels}
              optionRoles={Object.fromEntries(employeeOptions.map((e) => [e.id, e.role ?? "EMPLOYEE"]))}
              options={employeeOptions.map((e) => e.id)}
              placeholder="Assign team members"
            />

            <button
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(29,78,216,0.3)] transition hover:opacity-90 disabled:opacity-60"
              disabled={createPending}
              type="submit"
            >
              {createPending ? "Creating Project…" : "Create Project"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Sub-components ─── */

function StatPill({ color, label, pulse = false, value }: { color: "blue" | "emerald" | "slate" | "rose" | "violet"; label: string; pulse?: boolean; value: string }) {
  const bg = { blue: "bg-white/10", emerald: "bg-emerald-500/20", slate: "bg-white/8", rose: "bg-rose-500/20", violet: "bg-violet-500/20" }[color];
  const dot = { blue: "bg-blue-300", emerald: "bg-emerald-300", slate: "bg-slate-400", rose: "bg-rose-300", violet: "bg-violet-300" }[color];
  return (
    <div className={`rounded-2xl border border-white/10 px-4 py-3 ${bg}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`} />
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-white/50">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

type FieldProps = {
  defaultValue?: string;
  fallbackTodayForDate?: boolean;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
};

function Field({ defaultValue, fallbackTodayForDate = false, label, name, placeholder, required = true, type = "text" }: FieldProps) {
  const val = type === "date" && fallbackTodayForDate ? (defaultValue || getTodayDate()) : defaultValue;
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 ${type === "date" ? "[color-scheme:light]" : ""}`}
        defaultValue={val}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextAreaField({ defaultValue, label, name, placeholder }: Omit<FieldProps, "type" | "fallbackTodayForDate">) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  labels,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  labels?: Record<string, string>;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </select>
    </label>
  );
}

// Role badge config for the multi-select dropdown
const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  SUPER_ADMIN: { label: "Super Admin", bg: "#fdf4ff", text: "#7c3aed" },
  MANAGER:     { label: "Admin",       bg: "#eff6ff", text: "#1d4ed8" },
  EMPLOYEE:    { label: "Employee",    bg: "#f0fdf4", text: "#166534" },
};

function MultiSelect({
  defaultValue,
  label,
  name,
  optionLabels,
  optionRoles,
  options,
  placeholder,
}: {
  defaultValue: string[];
  label: string;
  name: string;
  optionLabels?: Record<string, string>;
  optionRoles?: Record<string, string>; // id → role string
  options: string[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [search, setSearch] = useState("");

  function toggle(val: string) {
    setSelected((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  }

  // Group options by role when optionRoles is provided
  const hasRoles = Boolean(optionRoles && Object.keys(optionRoles).length > 0);
  const roleOrder = ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"];

  const filteredOptions = search.trim()
    ? options.filter((opt) => (optionLabels?.[opt] ?? opt).toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  // Build grouped structure
  const grouped: Array<{ roleKey: string; items: string[] }> = hasRoles
    ? roleOrder
        .map((roleKey) => ({
          roleKey,
          items: filteredOptions.filter((opt) => (optionRoles?.[opt] ?? "EMPLOYEE") === roleKey),
        }))
        .filter((g) => g.items.length > 0)
    : [{ roleKey: "", items: filteredOptions }];

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={`${name}Csv`} type="hidden" value={selected.join(",")} />
      <div className="relative">
        {/* Trigger button */}
        <button
          className="flex min-h-[2.9rem] w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left text-slate-900 outline-none transition focus:border-blue-300 hover:border-blue-300"
          onClick={() => setIsOpen((v) => !v)}
          type="button"
        >
          <div className="flex flex-1 flex-wrap gap-1.5">
            {selected.length ? (
              selected.map((v) => {
                const role = optionRoles?.[v];
                const rb = role ? ROLE_BADGE[role] : undefined;
                return (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-blue-700"
                    key={v}
                  >
                    {/* Short name only (before the email paren) */}
                    {(optionLabels?.[v] ?? v).split(" (")[0]}
                    {rb ? (
                      <span
                        className="rounded-full px-1.5 py-px text-[0.52rem] font-bold"
                        style={{ background: rb.bg, color: rb.text }}
                      >
                        {rb.label}
                      </span>
                    ) : null}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-slate-400">{placeholder}</span>
            )}
          </div>
          <svg className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" height="14" viewBox="0 0 24 24" width="14">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>

        {/* Dropdown */}
        <div
          className={`absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)] transition-all ${
            isOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
          }`}
        >
          {/* Search box */}
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <svg className="shrink-0 text-slate-400" fill="none" height="13" viewBox="0 0 24 24" width="13">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              <input
                className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                value={search}
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">No matches found.</p>
            ) : (
              grouped.map(({ roleKey, items }) => (
                <div key={roleKey || "all"}>
                  {/* Role group header */}
                  {roleKey && ROLE_BADGE[roleKey] ? (
                    <div className="mb-0.5 mt-1.5 flex items-center gap-2 px-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide"
                        style={{ background: ROLE_BADGE[roleKey].bg, color: ROLE_BADGE[roleKey].text }}
                      >
                        {ROLE_BADGE[roleKey].label}
                      </span>
                      <span className="h-px flex-1 bg-slate-100" />
                    </div>
                  ) : null}

                  {items.map((opt) => {
                    const checked = selected.includes(opt);
                    const role = optionRoles?.[opt];
                    const rb = role ? ROLE_BADGE[role] : undefined;
                    const fullLabel = optionLabels?.[opt] ?? opt;
                    // Split "Name (email)" into parts
                    const parenIdx = fullLabel.indexOf(" (");
                    const namePart = parenIdx > -1 ? fullLabel.slice(0, parenIdx) : fullLabel;
                    const emailPart = parenIdx > -1 ? fullLabel.slice(parenIdx + 2, -1) : "";

                    return (
                      <label
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition ${
                          checked ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                        key={opt}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Custom checkbox */}
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                              checked ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"
                            }`}
                            onClick={() => toggle(opt)}
                          >
                            {checked ? (
                              <svg fill="none" height="10" viewBox="0 0 12 10" width="10">
                                <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                            ) : null}
                          </div>
                          <input checked={checked} className="sr-only" name={name} onChange={() => toggle(opt)} type="checkbox" value={opt} />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-semibold truncate ${checked ? "text-blue-800" : "text-slate-800"}`}>
                                {namePart}
                              </span>
                              {rb ? (
                                <span
                                  className="shrink-0 rounded-full px-1.5 py-px text-[0.52rem] font-bold"
                                  style={{ background: rb.bg, color: rb.text }}
                                >
                                  {rb.label}
                                </span>
                              ) : null}
                            </div>
                            {emailPart ? (
                              <p className={`text-[0.65rem] truncate ${checked ? "text-blue-500" : "text-slate-400"}`}>{emailPart}</p>
                            ) : null}
                          </div>
                        </div>
                        {checked ? (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[0.6rem] font-bold text-blue-600">✓</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {selected.length > 0 ? (
        <p className="mt-1.5 text-[0.7rem] font-semibold text-slate-400">{selected.length} selected</p>
      ) : null}
    </div>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}
