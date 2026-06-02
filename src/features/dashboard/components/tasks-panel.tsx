"use client";

import React, { type ReactNode, useActionState, useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { addTaskComment, createTask, updateTaskStatus } from "@/features/dashboard/actions/tasks";
import { emitDashboardSync, subscribeDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import { FormActionButton } from "@/shared/ui/form-action-button";
import type { TaskEntry, TaskPageData } from "@/features/dashboard/types";
import type { TaskPriority } from "@/database/mongodb/models/task";

type TasksPanelProps = {
  canAssign: boolean;
  data: TaskPageData;
  readOnly: boolean;
};

const INITIAL_TASK_STATE = {
  values: {
    title: "",
    description: "",
    assignedUserId: "",
    dueDate: new Date().toISOString().slice(0, 10),
    priority: "MEDIUM" as TaskPriority,
    labels: [] as string[],
  },
};

const STATUS_CONFIG: Record<string, { gradient: string; chip: string; chipText: string; dot: string; label: string }> = {
  PENDING:     { gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)", chip: "rgba(245,158,11,0.12)", chipText: "#d97706", dot: "#f59e0b", label: "Pending" },
  IN_PROGRESS: { gradient: "linear-gradient(135deg,#3b82f6,#6366f1)", chip: "rgba(99,102,241,0.12)", chipText: "#4f46e5", dot: "#6366f1", label: "In Progress" },
  COMPLETED:   { gradient: "linear-gradient(135deg,#10b981,#34d399)", chip: "rgba(16,185,129,0.12)", chipText: "#059669", dot: "#10b981", label: "Completed" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH:   { bg: "rgba(239,68,68,0.09)",  text: "#dc2626", border: "rgba(239,68,68,0.22)",  label: "High" },
  MEDIUM: { bg: "rgba(245,158,11,0.09)", text: "#d97706", border: "rgba(245,158,11,0.22)", label: "Medium" },
  LOW:    { bg: "rgba(100,116,139,0.09)",text: "#475569", border: "rgba(100,116,139,0.2)", label: "Low" },
};

export function TasksPanel({ canAssign, data, readOnly }: TasksPanelProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTask, INITIAL_TASK_STATE);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [labelFilter, setLabelFilter] = useState("ALL");

  const refreshView = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    if (state.success) {
      emitDashboardSync("task-created");
      setIsCreateOpen(false);
    }
  }, [state.success]);

  // Auto-refresh when admin assigns a task (employee sees it instantly)
  useEffect(() => {
    const unsub = subscribeDashboardSync(refreshView);
    const onVisible = () => { if (document.visibilityState === "visible") refreshView(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { unsub(); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshView]);

  const filteredTasks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return data.tasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (labelFilter !== "ALL" && !task.labels.includes(labelFilter)) return false;
      if (!q) return true;
      return [task.title, task.description, task.assignedUserName, task.assignedByName, task.labels.join(" ")]
        .join(" ").toLowerCase().includes(q);
    });
  }, [data.tasks, labelFilter, priorityFilter, searchTerm, statusFilter]);

  const pending_count  = data.tasks.filter((t) => t.status === "PENDING").length;
  const inprogress_count = data.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completed_count = data.tasks.filter((t) => t.status === "COMPLETED").length;
  const overdue_count  = data.tasks.filter((t) => t.isOverdue).length;
  const high_count     = data.tasks.filter((t) => t.priority === "HIGH").length;

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard gradient="linear-gradient(135deg,#f59e0b,#fbbf24)" shadow="rgba(245,158,11,0.3)" icon={<ClockIcon />} label="Pending"       value={pending_count} />
        <StatCard gradient="linear-gradient(135deg,#6366f1,#818cf8)" shadow="rgba(99,102,241,0.3)"  icon={<PlayIcon />}  label="In Progress"   value={inprogress_count} />
        <StatCard gradient="linear-gradient(135deg,#10b981,#34d399)" shadow="rgba(16,185,129,0.3)"  icon={<CheckIcon />} label="Completed"     value={completed_count} />
        <StatCard gradient="linear-gradient(135deg,#ef4444,#f87171)" shadow="rgba(239,68,68,0.3)"   icon={<AlertIcon />} label="Overdue"        value={overdue_count} />
        <StatCard gradient="linear-gradient(135deg,#ec4899,#f43f5e)" shadow="rgba(236,72,153,0.3)"  icon={<FireIcon />}  label="High Priority"  value={high_count} />
      </div>

      {/* ── Task board (full width) ── */}
      <div className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.08)" }}>
        <div className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Task Board</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-800">
                {canAssign ? "All Tasks" : "My Tasks"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {canAssign && (
                <button
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 6px 18px rgba(99,102,241,0.35)" }}
                  onClick={() => setIsCreateOpen(true)}
                  type="button"
                >
                  + Create Task
                </button>
              )}
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                <span className="text-[0.65rem] font-bold text-indigo-600">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 border-b border-slate-100 px-6 py-4">
            <div className="relative flex min-w-[180px] flex-1 items-center">
              <span className="pointer-events-none absolute left-3.5 text-slate-400">
                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 placeholder:text-slate-400"
                placeholder="Search tasks…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <FilterPill label="Status"   value={statusFilter}   options={["ALL","PENDING","IN_PROGRESS","COMPLETED"]} onChange={setStatusFilter} />
            <FilterPill label="Priority" value={priorityFilter} options={["ALL","LOW","MEDIUM","HIGH"]}               onChange={setPriorityFilter} />
            <FilterPill label="Label"    value={labelFilter}    options={["ALL",...data.labelOptions]}                onChange={setLabelFilter} />
          </div>

          {/* Task cards */}
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>
                📋
              </div>
              <p className="text-base font-bold text-slate-600">No tasks found</p>
              <p className="mt-1 text-sm text-slate-400">
                {data.tasks.length === 0 && !canAssign
                  ? "Your manager will assign tasks to you. You'll get a notification instantly."
                  : "Try adjusting the filters above."}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  readOnly={readOnly}
                  isLast={i === filteredTasks.length - 1}
                  onTaskUpdated={refreshView}
                />
              ))}
            </div>
          )}
      </div>

      {/* ── Create Task Modal ── */}
      {isCreateOpen && canAssign ? (
        <CreateTaskModal
          data={data}
          formAction={formAction}
          onClose={() => setIsCreateOpen(false)}
          pending={pending}
          state={state as CreateTaskState}
        />
      ) : null}
    </div>
  );
}

/* ─── Create Task Modal ─── */
type CreateTaskState = {
  error?: string;
  success?: string;
  values?: {
    title?: string;
    description?: string;
    assignedUserId?: string;
    dueDate?: string;
    priority?: TaskPriority;
    labels?: string[];
  };
};

function CreateTaskModal({
  data,
  formAction,
  onClose,
  pending,
  state,
}: {
  data: TaskPageData;
  formAction: (fd: FormData) => void;
  onClose: () => void;
  pending: boolean;
  state: CreateTaskState;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative shrink-0 px-6 pb-5 pt-6"
          style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)" }}>
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
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-white/20">
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path d="M12 5v14M5 12h14" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-white/70">Assign Task</p>
              <h4 className="mt-0.5 text-xl font-bold text-white">Create Task</h4>
              <p className="mt-0.5 text-sm text-white/60">Assign a task to yourself, an admin, or a team member with priority and due date.</p>
            </div>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <form action={formAction} className="space-y-4 px-6 py-5" ref={formRef}>
            {state.error && <Feedback>{state.error}</Feedback>}
            {state.success && <Feedback tone="success">{state.success}</Feedback>}

            <FormField icon={<TitleIcon />} label="Task Title" name="title" placeholder="Enter task title" defaultValue={state.values?.title} />
            <FormTextArea label="Description" name="description" placeholder="Describe the work clearly" defaultValue={state.values?.description} />
            <FormSelect
              icon={<UserIcon />}
              label="Assign To"
              name="assignedUserId"
              defaultValue={state.values?.assignedUserId ?? ""}
              includePlaceholder
              options={data.employeeOptions.map((e) => e.id)}
              labels={Object.fromEntries(data.employeeOptions.map((e) => [e.id, e.label]))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={<CalIcon />} label="Due Date" name="dueDate" placeholder="Due date" type="date" defaultValue={state.values?.dueDate} />
              <FormSelect
                icon={<FlagIcon />}
                label="Priority"
                name="priority"
                defaultValue={state.values?.priority ?? "MEDIUM"}
                options={["LOW", "MEDIUM", "HIGH"]}
                labels={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }}
              />
            </div>

            {/* Labels */}
            <div>
              <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500">Labels</p>
              <div className="flex flex-wrap gap-2">
                {data.labelOptions.map((lbl) => (
                  <label
                    key={lbl}
                    className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition-all"
                    style={{ borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)", color: "#4f46e5" }}
                  >
                    <input className="accent-indigo-500" defaultChecked={state.values?.labels?.includes(lbl)} name="labels" type="checkbox" value={lbl} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            {/* Attachment */}
            <div>
              <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500">Attachments</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                style={{ borderColor: "rgba(99,102,241,0.2)" }}>
                <svg fill="none" height="18" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="text-sm text-slate-500">Click to attach files</span>
                <input className="hidden" multiple name="attachments" type="file" />
              </label>
            </div>

            <button
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}
              disabled={pending}
              type="submit"
            >
              {pending ? "Assigning…" : "✓ Assign Task"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Task Card ─── */
function TaskCard({
  task,
  readOnly,
  isLast,
  onTaskUpdated,
}: {
  task: TaskEntry;
  readOnly: boolean;
  isLast: boolean;
  onTaskUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING;
  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.LOW;

  const dueDateDisplay = task.dueDate && task.dueDate !== "—" ? task.dueDate : null;

  return (
    <div
      className="transition-colors hover:bg-slate-50/60"
      style={{ borderBottom: isLast ? "none" : "1px solid rgba(241,245,249,1)" }}
    >
      <div className="px-6 py-4">
        <div className="flex flex-wrap items-start gap-3">
          {/* Left accent bar */}
          <div className="mt-1 h-full w-1 shrink-0 self-stretch rounded-full" style={{ background: sc.gradient, minHeight: 48 }} />

          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-[0.95rem] font-bold text-slate-800">{task.title}</h3>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* Status badge */}
                <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
                  style={{ background: sc.chip, color: sc.chipText }}>
                  <span className={`h-1.5 w-1.5 rounded-full ${task.status === "IN_PROGRESS" ? "animate-pulse" : ""}`}
                    style={{ background: sc.dot }} />
                  {sc.label}
                </span>
                {/* Priority badge */}
                <span className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
                  style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                  {pc.label}
                </span>
                {/* Overdue badge */}
                {task.isOverdue && (
                  <span className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                    ⚠ Overdue
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="mt-1.5 text-[0.82rem] leading-5 text-slate-500 line-clamp-2">{task.description}</p>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.72rem] text-slate-500">
              {/* Assigned by */}
              <span className="flex items-center gap-1">
                <svg fill="none" height="12" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24" width="12">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <span className="font-semibold text-indigo-600">{task.assignedByName || "Admin"}</span>
                <span className="text-slate-400">assigned to</span>
                <span className="font-semibold text-slate-700">{task.assignedUserName}</span>
              </span>

              {/* Due date */}
              {dueDateDisplay && (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                  style={
                    task.isOverdue
                      ? { background: "rgba(239,68,68,0.08)", color: "#dc2626" }
                      : { background: "rgba(99,102,241,0.07)", color: "#4f46e5" }
                  }
                >
                  <svg fill="none" height="10" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="10">
                    <rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  Due {dueDateDisplay}
                </span>
              )}

              {/* Labels */}
              {task.labels.length > 0 && task.labels.map((lbl) => (
                <span key={lbl} className="rounded-full px-2 py-0.5 font-semibold"
                  style={{ background: "rgba(99,102,241,0.07)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.12)" }}>
                  {lbl}
                </span>
              ))}
            </div>

            {/* Attachments */}
            {task.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {task.attachments.map((att) => (
                  <a
                    key={att.url}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition-colors hover:brightness-95"
                    href={att.url}
                    rel="noreferrer"
                    target="_blank"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}
                  >
                    📎 {att.name}
                  </a>
                ))}
              </div>
            )}

            {/* Status update (employee only) + expand for comments */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {!readOnly && (
                <form
                  action={async (formData) => {
                    await updateTaskStatus(formData);
                    emitDashboardSync("task-updated");
                    onTaskUpdated();
                  }}
                  className="flex items-center gap-2"
                >
                  <input name="taskId" type="hidden" value={task.id} />
                  <select
                    className="rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                    defaultValue={task.status}
                    name="status"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                  <FormActionButton
                    className="rounded-xl px-3 py-1.5 text-xs font-bold"
                    style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" } as React.CSSProperties}
                    pendingLabel="Saving…"
                    type="submit"
                  >
                    Update
                  </FormActionButton>
                </form>
              )}
              <button
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.65rem] font-semibold transition-colors"
                style={{ background: "rgba(99,102,241,0.07)", color: "#6366f1" }}
                onClick={() => setExpanded((v) => !v)}
                type="button"
              >
                <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {task.comments.length} comment{task.comments.length !== 1 ? "s" : ""}
                <span>{expanded ? "▲" : "▼"}</span>
              </button>
            </div>

            {/* Comments section (expandable) */}
            {expanded && (
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {task.comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500">
                    No comments yet.
                  </div>
                ) : (
                  task.comments.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                          {c.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[0.72rem] font-bold text-slate-800">{c.userName}</span>
                        <span className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase"
                          style={{ background: "rgba(99,102,241,0.07)", color: "#6366f1" }}>{c.role}</span>
                        <span className="text-[0.68rem] text-slate-400">{c.createdAt}</span>
                      </div>
                      <p className="mt-1.5 text-[0.82rem] leading-5 text-slate-600">{c.message}</p>
                    </div>
                  ))
                )}
                {!readOnly && (
                  <form
                    action={async (formData) => {
                      await addTaskComment(formData);
                      emitDashboardSync("task-comment-added");
                      onTaskUpdated();
                    }}
                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <input name="taskId" type="hidden" value={task.id} />
                    <textarea
                      className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      name="message"
                      placeholder="Add a comment or update..."
                      required
                    />
                    <div className="flex justify-end">
                      <FormActionButton
                        className="h-11 w-full rounded-xl px-6 text-sm font-bold sm:w-auto"
                        style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none" } as React.CSSProperties}
                        pendingLabel="Sending..."
                        type="submit"
                      >
                        Send
                      </FormActionButton>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ gradient, shadow, icon, label, value }: {
  gradient: string; shadow: string; icon: ReactNode; label: string; value: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] p-4 text-white"
      style={{ background: gradient, boxShadow: `0 8px 24px ${shadow}` }}>
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">{icon}</div>
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em] text-white/70">{label}</p>
          <p className="text-2xl font-black leading-none text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter pill ─── */
function FilterPill({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-7 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "ALL" ? `All ${label}` : o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
        <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><polyline points="6 9 12 15 18 9" /></svg>
      </span>
    </div>
  );
}

/* ─── Form helpers ─── */
function FormField({ icon, label, name, placeholder, type = "text", defaultValue }: {
  icon?: ReactNode; label: string; name: string; placeholder: string; type?: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>{label}</label>
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        {icon && <span className="pointer-events-none absolute left-3.5 text-indigo-400">{icon}</span>}
        <input
          className={`min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${icon ? "pl-9 pr-4" : "px-4"} ${type === "date" ? "scheme-light" : ""}`}
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </div>
    </div>
  );
}

function FormTextArea({ label, name, placeholder, defaultValue }: {
  label: string; name: string; placeholder: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>{label}</label>
      <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        <span className="pointer-events-none absolute left-3.5 top-3.5 text-indigo-400">
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
        <textarea
          className="min-h-24 w-full bg-transparent py-3 pl-9 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  );
}

function FormSelect({ icon, label, name, defaultValue, includePlaceholder = false, options, labels }: {
  icon?: ReactNode; label: string; name: string; defaultValue: string;
  includePlaceholder?: boolean; options: string[]; labels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>{label}</label>
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        {icon && <span className="pointer-events-none absolute left-3.5 text-indigo-400">{icon}</span>}
        <select
          className={`w-full appearance-none bg-transparent py-3 pr-8 text-sm text-slate-800 outline-none ${icon ? "pl-9" : "pl-4"}`}
          defaultValue={defaultValue}
          id={name}
          name={name}
        >
          {includePlaceholder && <option disabled value="">Select assignee</option>}
          {options.map((o) => (
            <option key={o} value={o}>{labels?.[o] ?? o}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-slate-400">
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="13"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>
    </div>
  );
}

/* ─── Icons ─── */
function ClockIcon() {
  return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function PlayIcon() {
  return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
}
function CheckIcon() {
  return <svg fill="none" height="18" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24" width="18"><polyline points="20 6 9 17 4 12" /></svg>;
}
function AlertIcon() {
  return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>;
}
function FireIcon() {
  return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
}
function TitleIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><line x1="21" x2="3" y1="6" y2="6" /><line x1="15" x2="3" y1="12" y2="12" /><line x1="17" x2="3" y1="18" y2="18" /></svg>;
}
function UserIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function CalIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>;
}
function FlagIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></svg>;
}
