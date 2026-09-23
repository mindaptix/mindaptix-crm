"use client";

import { formatTaskDeadline } from "@/features/tasks/deadline";
import { formatIndiaDateKey } from "@/shared/lib/india-time";
import React, { type ReactNode, useActionState, useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addTaskComment, closeTask, createTask, deleteTask, reviewTask, updateTaskStatus } from "@/features/dashboard/actions/tasks";
import { emitDashboardSync, subscribeDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import { FormActionButton } from "@/shared/ui/form-action-button";
import type { TaskEntry, TaskPageData } from "@/features/dashboard/types";
import type { TaskPriority } from "@/database/mongodb/models/task";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@/features/tasks/constants";

type TasksPanelProps = {
  canAssign: boolean;
  canManageLifecycle?: boolean;
  data: TaskPageData;
  readOnly: boolean;
};

const INITIAL_TASK_STATE = {
  values: {
    title: "",
    description: "",
    assignedUserId: "",
    dueDate: formatIndiaDateKey(new Date(Date.now() + 86_400_000)),
    dueTime: "18:00",
    priority: "MEDIUM" as TaskPriority,
    labels: [] as string[],
  },
};

const STATUS_CONFIG: Record<string, { chip: string; chipText: string; dot: string; label: string }> = {
  PENDING:        { chip: "rgba(245,158,11,0.12)",  chipText: "#d97706", dot: "#f59e0b", label: "Pending" },
  IN_PROGRESS:    { chip: "rgba(99,102,241,0.12)",  chipText: "#4f46e5", dot: "#6366f1", label: "In Progress" },
  COMPLETED:      { chip: "rgba(249,115,22,0.12)",  chipText: "#ea580c", dot: "#f97316", label: "Awaiting Review" },
  CLOSED:         { chip: "rgba(16,185,129,0.12)",  chipText: "#059669", dot: "#10b981", label: "Closed" },
  REJECTED:       { chip: "rgba(239,68,68,0.12)",   chipText: "#dc2626", dot: "#ef4444", label: "Rejected" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH:   { bg: "rgba(239,68,68,0.09)",  text: "#dc2626", border: "rgba(239,68,68,0.22)",  label: "High" },
  MEDIUM: { bg: "rgba(245,158,11,0.09)", text: "#d97706", border: "rgba(245,158,11,0.22)", label: "Medium" },
  LOW:    { bg: "rgba(100,116,139,0.09)",text: "#475569", border: "rgba(100,116,139,0.2)", label: "Low" },
};

export function TasksPanel({ canAssign, canManageLifecycle = false, data, readOnly }: TasksPanelProps) {
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

  const pending_count        = data.tasks.filter((t) => t.status === "PENDING").length;
  const inprogress_count     = data.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const awaiting_review_count = data.tasks.filter((t) => t.status === "COMPLETED").length;
  const closed_count         = data.tasks.filter((t) => t.status === "CLOSED").length;
  const rejected_count       = data.tasks.filter((t) => t.status === "REJECTED").length;

  return (
    <div className="space-y-4 px-3 py-3 sm:px-7 sm:py-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm">
          <span className="font-semibold text-slate-800">Task summary</span>
          <SummaryCount label="Open" value={pending_count + inprogress_count + rejected_count} tone="text-slate-700" />
          <SummaryCount label="In progress" value={inprogress_count} tone="text-violet-700" />
          <SummaryCount label="For review" value={awaiting_review_count} tone="text-amber-700" />
          <SummaryCount label="Done" value={closed_count} tone="text-emerald-700" />
        </div>
      </section>

      {/* ── Task board (full width) ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Workspace / Work board</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                {canAssign ? "All Tasks" : "My Tasks"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {!readOnly && (
                <button
                  className="crm-primary"
                  onClick={() => setIsCreateOpen(true)}
                  type="button"
                >
                  + New task
                </button>
              )}
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3 sm:px-6">
            <div className="relative flex min-w-[180px] flex-1 items-center">
              <span className="pointer-events-none absolute left-3.5 text-slate-400">
                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400"
                placeholder="Search tasks…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <FilterPill
              label="Status"
              value={statusFilter}
              options={["ALL","PENDING","IN_PROGRESS","COMPLETED","CLOSED","REJECTED"]}
              onChange={setStatusFilter}
              labels={{ PENDING: "Pending", IN_PROGRESS: "In Progress", COMPLETED: "Awaiting Review", CLOSED: "Closed", REJECTED: "Rejected" }}
            />
            <FilterPill label="Priority" value={priorityFilter} options={["ALL","LOW","MEDIUM","HIGH"]}               onChange={setPriorityFilter} />
            <FilterPill label="Label"    value={labelFilter}    options={["ALL",...data.labelOptions]}                onChange={setLabelFilter} />
          </div>

          <div className="hidden grid-cols-[minmax(260px,2fr)_150px_175px_130px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
            <span>Task</span><span>Status</span><span>Owner</span><span>Due date</span><span>Priority</span>
          </div>

          {/* Task rows */}
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
            <div className="divide-y divide-slate-200">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  canAssign={canAssign}
                  canManageLifecycle={canManageLifecycle}
                  task={task}
                  readOnly={readOnly}
                  onTaskUpdated={refreshView}
                />
              ))}
            </div>
          )}
      </div>

      {/* ── Create Task Modal ── */}
      {isCreateOpen && !readOnly ? (
        <CreateTaskModal
          canAssign={canAssign}
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
    dueTime?: string;
    priority?: TaskPriority;
    labels?: string[];
  };
};

function CreateTaskModal({
  canAssign,
  data,
  formAction,
  onClose,
  pending,
  state,
}: {
  canAssign: boolean;
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
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-slate-200 bg-white px-6 py-5">
          <button
            aria-label="Close"
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 shadow-sm">
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path d="M12 5v14M5 12h14" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Work management</p>
              <h4 className="mt-0.5 text-lg font-semibold text-slate-900">Create task</h4>
              <p className="mt-0.5 text-sm text-slate-500">{canAssign ? "Set an owner, due date, and priority." : "Create your work plan with a deadline and priority."}</p>
            </div>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <form action={formAction} className="space-y-5 px-6 py-5" ref={formRef}>
            {state.error && <Feedback>{state.error}</Feedback>}
            {state.success && <Feedback tone="success">{state.success}</Feedback>}

            <div className="grid gap-4 sm:grid-cols-[1.25fr_.75fr]">
              <FormField icon={<TitleIcon />} label="Task title" name="title" placeholder="e.g. Prepare client presentation" defaultValue={state.values?.title} />
              <FormSelect icon={<FlagIcon />} label="Priority" name="priority" defaultValue={state.values?.priority ?? "MEDIUM"} options={["LOW", "MEDIUM", "HIGH"]} labels={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }} />
            </div>
            <FormTextArea label="Description" name="description" placeholder="Add context, deliverables, and acceptance criteria" defaultValue={state.values?.description} maxLength={TASK_DESCRIPTION_MAX_LENGTH} />
            <div className={`grid gap-4 sm:grid-cols-2 ${canAssign ? "lg:grid-cols-3" : ""}`}>
              {canAssign ? <FormSelect icon={<UserIcon />} label="Owner" name="assignedUserId" defaultValue={state.values?.assignedUserId ?? ""} includePlaceholder options={data.employeeOptions.map((e) => e.id)} labels={Object.fromEntries(data.employeeOptions.map((e) => [e.id, e.label]))} /> : null}
              <FormField icon={<CalIcon />} label="Deadline Date (IST)" name="dueDate" placeholder="Due date" type="date" defaultValue={state.values?.dueDate} />
              <FormField icon={<CalIcon />} label="Deadline Time (IST)" name="dueTime" placeholder="18:00" type="time" defaultValue={state.values?.dueTime ?? "18:00"} />
            </div>

            {/* Labels */}
            <div>
              <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500">Labels</p>
              <div className="flex flex-wrap gap-2">
                {data.labelOptions.map((lbl) => (
                  <label
                    key={lbl}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
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
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
                <svg fill="none" height="18" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="text-sm text-slate-500">Click to attach files</span>
                <input className="hidden" multiple name="attachments" type="file" />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <button className="rounded-md px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100" onClick={onClose} type="button">Cancel</button>
              <button className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">{pending ? "Creating…" : "Create task"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Task Card ─── */
function TaskCard({
  canAssign,
  canManageLifecycle,
  task,
  readOnly,
  onTaskUpdated,
}: {
  canAssign: boolean;
  canManageLifecycle: boolean;
  task: TaskEntry;
  readOnly: boolean;
  onTaskUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING;
  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.LOW;

  const dueDateDisplay = task.deadlineAt ? formatTaskDeadline(task.deadlineAt) : task.dueDate;

  return (
    <article className="transition-colors hover:bg-slate-50/70">
      <div className="px-5 py-4 sm:px-6">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(260px,2fr)_150px_175px_130px_110px] lg:items-start lg:gap-4">
          <div className="min-w-0">
            {/* Title row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-[0.95rem] font-semibold text-slate-900">{task.title}</h3>
              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:hidden">
                {/* Status badge */}
                <span className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
                  style={{ background: sc.chip, color: sc.chipText }}>
                  <span className={`h-1.5 w-1.5 rounded-full ${task.status === "IN_PROGRESS" ? "animate-pulse" : ""}`}
                    style={{ background: sc.dot }} />
                  {sc.label}
                </span>
                {/* Priority badge */}
                <span className="rounded-md px-2.5 py-1 text-xs font-semibold"
                  style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                  {pc.label}
                </span>
                {/* Overdue badge */}
                {task.isOverdue && (
                  <span className="rounded-md px-2.5 py-1 text-xs font-semibold"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                    ⚠ Overdue
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="mt-1.5 text-[0.82rem] leading-5 text-slate-500 line-clamp-2">{task.description}</p>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.72rem] text-slate-500 lg:hidden">
              {/* Assigned by */}
              <span className="flex items-center gap-1">
                <svg fill="none" height="12" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24" width="12">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <span className="font-semibold text-indigo-600">{task.assignedByName || "Admin"}</span>
                <span className="text-slate-400">assigned to</span>
                {task.assignedUserPhotoUrl ? (
                  <Image
                    alt={task.assignedUserName}
                    className="h-5 w-5 rounded-full object-cover"
                    height={20}
                    src={task.assignedUserPhotoUrl}
                    width={20}
                  />
                ) : null}
                <span className="font-semibold text-slate-700">{task.assignedUserName}</span>
              </span>

              {/* Due date */}
              {dueDateDisplay && (
                <span
                  className="flex items-center gap-1 rounded-md px-2 py-1 font-medium"
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
                <span key={lbl} className="rounded-md px-2 py-1 font-medium"
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
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95"
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

            {/* Rejection banner for employees */}
            {!canAssign && task.status === "REJECTED" && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
                <span className="mt-0.5 text-red-500">
                  <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                </span>
                <p className="text-[0.75rem] font-semibold text-red-600">
                  This task was rejected by your admin. Please revise and resubmit.
                </p>
              </div>
            )}

            {/* Status update + comments + delete */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* Employee status dropdown — only for assigned user, only PENDING/IN_PROGRESS/COMPLETED */}
              {!canAssign && !readOnly && task.status !== "CLOSED" && (
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
                    className="rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    defaultValue={task.status === "REJECTED" ? "IN_PROGRESS" : task.status}
                    name="status"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Submit for Review</option>
                  </select>
                  <FormActionButton
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    pendingLabel="Saving…"
                    type="submit"
                  >
                    Update
                  </FormActionButton>
                </form>
              )}

              {/* Admin Accept / Reject — only for COMPLETED (awaiting review) tasks */}
              {canAssign && task.status === "COMPLETED" && (
                <div className="flex items-center gap-2">
                  <form
                    action={async (formData) => {
                      await reviewTask(formData);
                      emitDashboardSync("task-updated");
                      onTaskUpdated();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input name="taskId" type="hidden" value={task.id} />
                    <input name="action" type="hidden" value="ACCEPT" />
                    <FormActionButton
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      pendingLabel="Accepting…"
                      type="submit"
                    >
                      ✓ Accept
                    </FormActionButton>
                  </form>
                  <form
                    action={async (formData) => {
                      await reviewTask(formData);
                      emitDashboardSync("task-updated");
                      onTaskUpdated();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input name="taskId" type="hidden" value={task.id} />
                    <input name="action" type="hidden" value="REJECT" />
                    <FormActionButton
                      className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      pendingLabel="Rejecting…"
                      type="submit"
                    >
                      ✗ Reject
                    </FormActionButton>
                  </form>
                </div>
              )}

              {canManageLifecycle && task.status !== "CLOSED" ? (
                <form action={async (formData) => {
                  const result = await closeTask(formData);
                  if (result.error) { window.alert(result.error); return; }
                  emitDashboardSync("task-closed");
                  onTaskUpdated();
                }}>
                  <input name="taskId" type="hidden" value={task.id} />
                  <FormActionButton className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.68rem] font-semibold text-emerald-700 transition hover:bg-emerald-100" pendingLabel="Closing…" type="submit">Close task</FormActionButton>
                </form>
              ) : null}

              {canManageLifecycle ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1">
                    <span className="text-[0.68rem] font-medium text-red-700">Delete permanently?</span>
                    <form action={async (formData) => {
                      const result = await deleteTask(formData);
                      if (result.error) { window.alert(result.error); return; }
                      emitDashboardSync("task-deleted");
                      onTaskUpdated();
                    }}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <FormActionButton className="text-[0.68rem] font-semibold text-red-700 hover:text-red-900" pendingLabel="Deleting…" type="submit">Delete</FormActionButton>
                    </form>
                    <button className="text-[0.68rem] font-medium text-slate-500 hover:text-slate-800" onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
                  </div>
                ) : (
                  <button className="rounded-md px-2 py-1.5 text-[0.68rem] font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)} type="button">Delete</button>
                )
              ) : null}

              <button
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
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
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                {task.comments.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500">
                    No comments yet.
                  </div>
                ) : (
                  task.comments.map((c) => (
                    <div key={c.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[0.6rem] font-semibold text-indigo-700">
                          {c.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[0.72rem] font-bold text-slate-800">{c.userName}</span>
                        <span className="rounded-md px-2 py-0.5 text-[0.65rem] font-semibold"
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
                    className="space-y-3 rounded-md border border-slate-200 bg-white p-3"
                  >
                    <input name="taskId" type="hidden" value={task.id} />
                    <textarea
                      className="min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      name="message"
                      placeholder="Add a comment or update..."
                      required
                    />
                    <div className="flex justify-end">
                      <FormActionButton
                        className="h-10 w-full rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
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
          <div className="hidden lg:block">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: sc.chip, color: sc.chipText }}>
              <span className={`h-1.5 w-1.5 rounded-full ${task.status === "IN_PROGRESS" ? "animate-pulse" : ""}`} style={{ background: sc.dot }} />
              {sc.label}
            </span>
            {task.isOverdue && <p className="mt-1.5 text-xs font-medium text-red-700">Overdue</p>}
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            {task.assignedUserPhotoUrl ? <Image alt={task.assignedUserName} className="h-7 w-7 shrink-0 rounded-full object-cover" height={28} src={task.assignedUserPhotoUrl} width={28} /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">{task.assignedUserName.slice(0, 1).toUpperCase()}</span>}
            <span className="truncate text-sm text-slate-700">{task.assignedUserName}</span>
          </div>
          <div className={`hidden text-sm lg:block ${task.isOverdue ? "font-medium text-red-700" : "text-slate-600"}`}>{dueDateDisplay || "No deadline"}</div>
          <div className="hidden lg:block"><span className="inline-flex rounded-md border px-2 py-1 text-xs font-semibold" style={{ background: pc.bg, color: pc.text, borderColor: pc.border }}>{pc.label}</span></div>
        </div>
      </div>
    </article>
  );
}

function SummaryCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <span className="flex items-center gap-2 text-xs text-slate-500"><span className={`text-sm font-semibold tabular-nums ${tone}`}>{value}</span>{label}</span>;
}

/* ─── Filter pill ─── */
function FilterPill({ label, value, options, onChange, labels }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="relative">
      <select
        className="appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-7 text-xs font-medium text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "ALL" ? `All ${label}` : (labels?.[o] ?? o.replace(/_/g, " "))}
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
      <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor={name}>{label}</label>
      <div className="relative flex items-center rounded-md border border-slate-300 bg-white transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        {icon && <span className="pointer-events-none absolute left-3.5 text-slate-400">{icon}</span>}
        <input
          className={`min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${icon ? "pl-9 pr-4" : "px-3"} ${type === "date" ? "scheme-light" : ""}`}
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

function FormTextArea({ label, name, placeholder, defaultValue, maxLength }: {
  label: string; name: string; placeholder: string; defaultValue?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor={name}>{label}</label>
      <div className="relative rounded-md border border-slate-300 bg-white transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        <span className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400">
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
        <textarea
          className="min-h-28 w-full bg-transparent py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          maxLength={maxLength}
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
      <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor={name}>{label}</label>
      <div className="relative flex items-center rounded-md border border-slate-300 bg-white transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        {icon && <span className="pointer-events-none absolute left-3.5 text-slate-400">{icon}</span>}
        <select
          className={`w-full appearance-none bg-transparent py-2.5 pr-8 text-sm text-slate-800 outline-none ${icon ? "pl-9" : "pl-3"}`}
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
