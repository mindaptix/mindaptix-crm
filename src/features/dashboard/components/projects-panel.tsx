"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createManagedProject, deleteManagedProject, updateManagedProject } from "@/features/dashboard/actions/projects";
import { emitDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import { FormActionButton } from "@/shared/ui/form-action-button";
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
  };
};

const INITIAL_PROJECT_STATE: ProjectFormState = {};

const STATUS_STYLES: Record<string, { card: string; chip: string; dot: string; label: string }> = {
  PLANNING:    { card: "border-blue-200/70",   chip: "border-blue-100 bg-blue-50 text-blue-700",     dot: "bg-blue-400",    label: "Planning" },
  IN_PROGRESS: { card: "border-emerald-200/70", chip: "border-emerald-100 bg-emerald-50 text-emerald-700", dot: "bg-emerald-400 animate-pulse", label: "In Progress" },
  ON_HOLD:     { card: "border-amber-200/70",   chip: "border-amber-100 bg-amber-50 text-amber-700",   dot: "bg-amber-400",   label: "On Hold" },
  COMPLETED:   { card: "border-slate-200",      chip: "border-slate-100 bg-slate-50 text-slate-600",   dot: "bg-slate-400",   label: "Completed" },
};

const PRIORITY_CHIP: Record<string, string> = {
  HIGH:   "border-rose-100 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-100 bg-amber-50 text-amber-700",
  LOW:    "border-slate-100 bg-slate-50 text-slate-500",
};

const STATUS_FILTERS = ["ALL", "PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED"] as const;

export function ProjectsPanel({ data }: ProjectsPanelProps) {
  const [createState, createProjectAction, createPending] = useActionState(createManagedProject, INITIAL_PROJECT_STATE);
  const [updateState, updateProjectAction, updatePending] = useActionState(updateManagedProject, INITIAL_PROJECT_STATE);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [lastUpdateSuccess, setLastUpdateSuccess] = useState<string | null>(null);

  const employeeLabels = useMemo(
    () => Object.fromEntries(data.employeeOptions.map((e) => [e.id, e.label])),
    [data.employeeOptions],
  );

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.projects.filter((project) => {
      if (statusFilter !== "ALL" && project.status !== statusFilter) return false;
      if (!query) return true;
      return [project.name, project.summary, project.status, project.priority, project.dueDate, ...project.techStack, ...project.assignedUserNames]
        .join(" ").toLowerCase().includes(query);
    });
  }, [data.projects, searchTerm, statusFilter]);

  const selectedProject = selectedProjectId
    ? data.projects.find((p) => p.id === selectedProjectId) ?? null
    : null;

  const inProgress = data.projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completed  = data.projects.filter((p) => p.status === "COMPLETED").length;
  const highPri    = data.projects.filter((p) => p.priority === "HIGH").length;

  useEffect(() => {
    if (createState.success) {
      emitDashboardSync("project-created");
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
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/50">Project Management</p>
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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Total" value={String(data.projects.length)} color="blue" />
          <StatPill label="In Progress" value={String(inProgress)} color="emerald" pulse />
          <StatPill label="Completed" value={String(completed)} color="slate" />
          <StatPill label="High Priority" value={String(highPri)} color="rose" />
        </div>
      </section>

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
              {f === "ALL" ? "All" : STATUS_STYLES[f]?.label ?? f}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-400">{filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Project cards grid ── */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-[1.8rem] border border-dashed border-slate-200 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">📁</div>
          <p className="text-sm font-semibold text-slate-500">No projects match your filter.</p>
          <p className="mt-1 text-xs text-slate-400">Try clearing the search or changing the status filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const s = STATUS_STYLES[project.status] ?? STATUS_STYLES.PLANNING;
            const overdue = project.dueDate ? project.dueDate < getTodayDate() && project.status !== "COMPLETED" : false;
            return (
              <article
                className={`group relative flex flex-col overflow-hidden rounded-[1.8rem] border bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)] ${s.card}`}
                key={project.id}
              >
                {/* Top accent bar */}
                <div className={`h-1 w-full ${project.status === "IN_PROGRESS" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : project.status === "PLANNING" ? "bg-gradient-to-r from-blue-400 to-cyan-400" : project.status === "ON_HOLD" ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-slate-300 to-slate-400"}`} />

                <div className="flex flex-1 flex-col p-5">
                  {/* Status + Priority row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${s.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${PRIORITY_CHIP[project.priority] ?? PRIORITY_CHIP.LOW}`}>
                      {project.priority}
                    </span>
                    {overdue ? (
                      <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-rose-600">
                        Overdue
                      </span>
                    ) : null}
                  </div>

                  {/* Project name + summary */}
                  <h3 className="mt-3 text-base font-semibold text-slate-950">{project.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">{project.summary || "No description added."}</p>

                  {/* Tech stack */}
                  {project.techStack.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-violet-700" key={tech}>
                          {tech}
                        </span>
                      ))}
                      {project.techStack.length > 4 ? (
                        <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-slate-400">
                          +{project.techStack.length - 4}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Footer: avatars + due date + edit */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      {/* Avatar stack */}
                      <div className="flex -space-x-1.5">
                        {project.assignedUserNames.slice(0, 4).map((name, i) => (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-slate-700 text-[0.58rem] font-bold text-white shadow-sm"
                            key={`${project.id}-av-${i}`}
                            title={name}
                          >
                            {name.trim().charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {project.assignedUserNames.length > 4 ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[0.58rem] font-bold text-slate-500">
                            +{project.assignedUserNames.length - 4}
                          </div>
                        ) : null}
                        {project.assignedUserNames.length === 0 ? (
                          <span className="text-xs text-slate-400">No team</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.dueDate ? (
                        <span className={`text-xs font-semibold ${overdue ? "text-rose-500" : "text-slate-400"}`}>
                          {overdue ? "⚠ " : ""}Due {project.dueDate}
                        </span>
                      ) : null}
                      <button
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
          employeeLabels={employeeLabels}
          employeeOptions={data.employeeOptions}
          onClose={() => setIsCreateOpen(false)}
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
  employeeOptions: { id: string; label: string }[];
  onClose: () => void;
  project: ProjectsPageData["projects"][number];
  technologyOptions: string[];
  updatePending: boolean;
  updateProjectAction: (fd: FormData) => void;
  updateState: ProjectFormState;
}) {
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
          <button
            aria-label="Close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            onClick={onClose}
            type="button"
          >
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </button>
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
              label="Assigned Employees"
              name="assignedUserIds"
              optionLabels={employeeLabels}
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

        {/* Delete footer */}
        <div className="shrink-0 border-t border-slate-100 bg-rose-50/40 px-6 py-3">
          <form action={deleteAction} className="flex items-center justify-between gap-3">
            <input name="projectId" type="hidden" value={project.id} />
            <div className="flex items-center gap-2">
              <svg className="shrink-0 text-rose-400" fill="none" height="14" viewBox="0 0 24 24" width="14">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
              <p className="text-xs text-rose-400">This will permanently delete the project and all its data.</p>
            </div>
            <FormActionButton
              className="w-auto shrink-0 border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-none hover:border-rose-300 hover:bg-rose-600 hover:text-white"
              pendingLabel="Deleting…"
              type="submit"
              variant="primary"
            >
              Delete
            </FormActionButton>
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
  employeeLabels,
  employeeOptions,
  onClose,
  technologyOptions,
}: {
  createPending: boolean;
  createProjectAction: (fd: FormData) => void;
  createState: ProjectFormState;
  employeeLabels: Record<string, string>;
  employeeOptions: { id: string; label: string }[];
  onClose: () => void;
  technologyOptions: string[];
}) {
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
        className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-6 pb-5 pt-6">
          <button
            aria-label="Close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            onClick={onClose}
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
        <div>
          <form action={createProjectAction} className="space-y-4 px-6 py-5">
            {createState.error ? <Feedback>{createState.error}</Feedback> : null}
            {createState.success ? <Feedback tone="success">{createState.success}</Feedback> : null}

            <Field defaultValue={createState.values?.name} label="Project Name" name="name" placeholder="Enter project name" />
            <TextAreaField defaultValue={createState.values?.summary} label="Project Summary" name="summary" placeholder="Describe the project scope and goals" />

            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField
                defaultValue={createState.values?.status ?? "PLANNING"}
                label="Status"
                labels={{ PLANNING: "Planning", IN_PROGRESS: "In Progress", ON_HOLD: "On Hold", COMPLETED: "Completed" }}
                name="status"
                options={["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]}
              />
              <SelectField
                defaultValue={createState.values?.priority ?? "MEDIUM"}
                label="Priority"
                labels={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }}
                name="priority"
                options={["LOW", "MEDIUM", "HIGH"]}
              />
              <Field
                defaultValue={createState.values?.dueDate}
                fallbackTodayForDate
                label="Due Date"
                name="dueDate"
                placeholder=""
                type="date"
              />
            </div>

            <MultiSelect
              defaultValue={createState.values?.techStack ?? []}
              key={`create-tech-${(createState.values?.techStack ?? []).join(",")}`}
              label="Tech Stack"
              name="techStack"
              optionLabels={Object.fromEntries(technologyOptions.map((o) => [o, o]))}
              options={technologyOptions}
              placeholder="Select technologies"
            />

            <MultiSelect
              defaultValue={createState.values?.assignedUserIds ?? []}
              key={`create-emp-${(createState.values?.assignedUserIds ?? []).join(",")}`}
              label="Assign Employees"
              name="assignedUserIds"
              optionLabels={employeeLabels}
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

function StatPill({ color, label, pulse = false, value }: { color: "blue" | "emerald" | "slate" | "rose"; label: string; pulse?: boolean; value: string }) {
  const bg = { blue: "bg-white/10", emerald: "bg-emerald-500/20", slate: "bg-white/8", rose: "bg-rose-500/20" }[color];
  const dot = { blue: "bg-blue-300", emerald: "bg-emerald-300", slate: "bg-slate-400", rose: "bg-rose-300" }[color];
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
  type?: string;
};

function Field({ defaultValue, fallbackTodayForDate = false, label, name, placeholder, type = "text" }: FieldProps) {
  const val = type === "date" && fallbackTodayForDate ? (defaultValue || getTodayDate()) : defaultValue;
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 ${type === "date" ? "[color-scheme:light]" : ""}`}
        defaultValue={val}
        name={name}
        placeholder={placeholder}
        required
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

function MultiSelect({
  defaultValue,
  label,
  name,
  optionLabels,
  options,
  placeholder,
}: {
  defaultValue: string[];
  label: string;
  name: string;
  optionLabels?: Record<string, string>;
  options: string[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultValue);

  function toggle(val: string) {
    setSelected((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={`${name}Csv`} type="hidden" value={selected.join(",")} />
      <div className="relative">
        <button
          className="flex min-h-[2.9rem] w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left text-slate-900 outline-none transition focus:border-blue-300 hover:border-blue-300"
          onClick={() => setIsOpen((v) => !v)}
          type="button"
        >
          <div className="flex flex-1 flex-wrap gap-1.5">
            {selected.length ? (
              selected.map((v) => (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-blue-700" key={v}>
                  {optionLabels?.[v] ?? v}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">{placeholder}</span>
            )}
          </div>
          <svg className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" height="14" viewBox="0 0 24 24" width="14">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>

        <div className={`absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.14)] transition-all ${isOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`}>
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No options available.</p>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition ${checked ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                  key={opt}
                >
                  <div className="flex items-center gap-2.5">
                    <input checked={checked} className="h-4 w-4 rounded border-slate-300 text-blue-600" name={name} onChange={() => toggle(opt)} type="checkbox" value={opt} />
                    <span className="font-medium">{optionLabels?.[opt] ?? opt}</span>
                  </div>
                  {checked ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-blue-600">✓</span>
                  ) : null}
                </label>
              );
            })
          )}
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
