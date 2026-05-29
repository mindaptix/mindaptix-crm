"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationsAsRead } from "@/features/dashboard/actions/notifications";
import type { UnreadAssignment } from "@/features/dashboard/types";

export function AssignmentAlertBanner({
  assignments,
  onDismiss,
}: {
  assignments: UnreadAssignment[];
  onDismiss: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await markNotificationsAsRead(assignments.map((a) => a.id));
      onDismiss();
    });
  }

  const taskCount    = assignments.filter((a) => a.type === "TASK_ASSIGNED").length;
  const projectCount = assignments.filter((a) => a.type === "PROJECT_ASSIGNED").length;

  return (
    <div
      className="overflow-hidden rounded-[1.8rem]"
      style={{
        background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f4c81 100%)",
        boxShadow: "0 20px 50px rgba(15,23,42,0.3)",
      }}
    >
      {/* Header strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
            style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            🎯
          </span>
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-yellow-300/80">New Assignments</p>
            <h3 className="text-base font-bold text-white">
              {assignments.length} new {assignments.length === 1 ? "assignment" : "assignments"} for you
              {taskCount > 0 && projectCount > 0
                ? ` — ${taskCount} task${taskCount > 1 ? "s" : ""} & ${projectCount} project${projectCount > 1 ? "s" : ""}`
                : taskCount > 0
                  ? ` — ${taskCount} task${taskCount > 1 ? "s" : ""}`
                  : ` — ${projectCount} project${projectCount > 1 ? "s" : ""}`}
            </h3>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          disabled={pending}
          onClick={handleDismiss}
          type="button"
        >
          <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
          {pending ? "Marking…" : "Dismiss"}
        </button>
      </div>

      {/* Assignment cards */}
      <div className="space-y-3 p-4 sm:p-5">
        {assignments.map((assignment) => {
          const isTask = assignment.type === "TASK_ASSIGNED";
          return (
            <div
              className="flex flex-col gap-3 rounded-[1.2rem] p-4 sm:flex-row sm:items-start sm:gap-4"
              key={assignment.id}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  background: isTask ? "rgba(99,102,241,0.25)" : "rgba(16,185,129,0.22)",
                  border: isTask ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(16,185,129,0.35)",
                }}
              >
                {isTask ? "📋" : "📁"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider"
                    style={{
                      background: isTask ? "rgba(99,102,241,0.2)" : "rgba(16,185,129,0.18)",
                      color: isTask ? "#a5b4fc" : "#6ee7b7",
                      border: isTask ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(16,185,129,0.3)",
                    }}
                  >
                    {isTask ? "Task Assigned" : "Project Assigned"}
                  </span>
                  {assignment.createdAt && (
                    <span className="text-[0.6rem] text-white/30">{assignment.createdAt}</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-bold text-white">{assignment.title}</p>
                <p className="mt-0.5 text-[0.75rem] leading-snug text-white/55">{assignment.message}</p>
              </div>

              <Link
                className="shrink-0 self-start rounded-xl px-4 py-2 text-[0.72rem] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                href={assignment.actionUrl || (isTask ? "/dashboard/tasks" : "/dashboard/projects")}
                onClick={handleDismiss}
                style={{
                  background: isTask ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "linear-gradient(135deg,#10b981,#0d9488)",
                  boxShadow: isTask ? "0 4px 12px rgba(99,102,241,0.35)" : "0 4px 12px rgba(16,185,129,0.3)",
                }}
              >
                {isTask ? "View Task →" : "View Project →"}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end px-5 pb-4 sm:px-6">
        <button
          className="text-[0.68rem] font-semibold text-white/40 transition hover:text-white/70 disabled:opacity-40"
          disabled={pending}
          onClick={handleDismiss}
          type="button"
        >
          {pending ? "Please wait…" : "Mark all as read ✓"}
        </button>
      </div>
    </div>
  );
}
