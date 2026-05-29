"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markNotificationsAsRead } from "@/features/dashboard/actions/notifications";
import type {
  CalendarEventItem,
  DashboardListItem,
  DashboardNotificationItem,
  DashboardOverviewData,
  PerformanceScoreRow,
  SummaryCard,
  UnreadAssignment,
} from "@/features/dashboard/types";

type EmployeeDashboardOverviewProps = {
  overview: DashboardOverviewData;
  roleBadge?: string;
};

/* ══════════════════════════════════════════════════════════════════════
   ASSIGNMENT ALERT BANNER
══════════════════════════════════════════════════════════════════════ */
function AssignmentAlertBanner({
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

  const taskCount = assignments.filter((a) => a.type === "TASK_ASSIGNED").length;
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
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
            style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.3)" }}>
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
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
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
              key={assignment.id}
              className="flex flex-col gap-3 rounded-[1.2rem] p-4 sm:flex-row sm:items-start sm:gap-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  background: isTask ? "rgba(99,102,241,0.25)" : "rgba(16,185,129,0.22)",
                  border: isTask ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(16,185,129,0.35)",
                }}
              >
                {isTask ? "📋" : "📁"}
              </div>

              {/* Content */}
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

              {/* CTA */}
              <Link
                href={assignment.actionUrl || (isTask ? "/dashboard/tasks" : "/dashboard/projects")}
                className="shrink-0 self-start rounded-xl px-4 py-2 text-[0.72rem] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: isTask
                    ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                    : "linear-gradient(135deg,#10b981,#0d9488)",
                  boxShadow: isTask
                    ? "0 4px 12px rgba(99,102,241,0.35)"
                    : "0 4px 12px rgba(16,185,129,0.3)",
                }}
                onClick={handleDismiss}
              >
                {isTask ? "View Task →" : "View Project →"}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex justify-end px-5 pb-4 sm:px-6"
      >
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="text-[0.68rem] font-semibold text-white/40 transition hover:text-white/70 disabled:opacity-40"
        >
          {pending ? "Please wait…" : "Mark all as read ✓"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACCENT CONFIG — one per stat card index
══════════════════════════════════════════════════════════════════════ */
const CARD_ACCENTS = [
  { from: "#0d9488", to: "#2dd4bf", bg: "rgba(13,148,136,0.08)", border: "rgba(13,148,136,0.22)", text: "#0d9488" },
  { from: "#8b5cf6", to: "#c4b5fd", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.22)", text: "#8b5cf6" },
  { from: "#f59e0b", to: "#fcd34d", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)", text: "#d97706" },
  { from: "#3b82f6", to: "#93c5fd", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.22)", text: "#2563eb" },
  { from: "#ef4444", to: "#fca5a5", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.22)",  text: "#dc2626" },
] as const;

/* ══════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════ */
export function EmployeeDashboardOverview({ overview, roleBadge }: EmployeeDashboardOverviewProps) {
  const [isPriorityAlertOpen, setIsPriorityAlertOpen] = useState(Boolean(overview.priorityAlert));
  const [isAssignmentBannerOpen, setIsAssignmentBannerOpen] = useState(
    Boolean(overview.unreadAssignments?.length),
  );

  return (
    <div className="space-y-5 px-3 pb-6 pt-1 sm:px-6 lg:px-7">
      {/* ── Assignment Alert (highest priority — shown first) ── */}
      {isAssignmentBannerOpen && overview.unreadAssignments && overview.unreadAssignments.length > 0 && (
        <AssignmentAlertBanner
          assignments={overview.unreadAssignments}
          onDismiss={() => setIsAssignmentBannerOpen(false)}
        />
      )}

      {overview.priorityAlert && isPriorityAlertOpen && (
        <DsrPriorityAlert
          actionLabel={overview.priorityAlert.actionLabel}
          actionUrl={overview.priorityAlert.actionUrl}
          detail={overview.priorityAlert.detail}
          onClose={() => setIsPriorityAlertOpen(false)}
          title={overview.priorityAlert.title}
        />
      )}

      {/* ── Hero ── */}
      <HeroBanner overview={overview} roleBadge={roleBadge} />

      {/* ── Stat Cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {overview.cards.map((card, i) => (
          <StatCard key={card.label} card={card} accent={CARD_ACCENTS[i % CARD_ACCENTS.length]!} index={i} />
        ))}
      </section>

      {/* ── Work Center ── */}
      <WorkCenterPanel
        title={overview.primaryListTitle}
        items={overview.primaryItems}
        actions={overview.secondaryItems}
        emptyMessage={overview.primaryEmptyMessage}
        actionEmptyMessage={overview.secondaryEmptyMessage}
      />

      {/* ── Weekly Pulse + Notifications ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <WeeklyPulsePanel cards={overview.weeklySummaryCards ?? []} title={overview.weeklySummaryTitle ?? "Weekly Summary"} />
        <NotificationPanel items={overview.notifications ?? []} title={overview.notificationTitle ?? "Updates"} />
      </div>

      {/* ── Calendar + Performance ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <CalendarPanel items={overview.calendarItems ?? []} title={overview.calendarTitle ?? "Upcoming Calendar"} />
        <PerformancePanel rows={overview.performanceRows ?? []} title={overview.performanceTitle ?? "My Score"} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HERO BANNER
══════════════════════════════════════════════════════════════════════ */
function HeroBanner({ overview, roleBadge }: { overview: DashboardOverviewData; roleBadge?: string }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl text-white"
      style={{
        background: "linear-gradient(135deg,#040f1a 0%,#071e30 40%,#0a3048 70%,#0d3d5a 100%)",
        boxShadow: "0 24px 60px rgba(4,15,26,0.35), 0 4px 12px rgba(4,15,26,0.2)",
      }}
    >
      {/* Mesh dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(45,212,191,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Glowing orbs */}
      <div
        className="pointer-events-none absolute -left-24 -top-16 h-64 w-64 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle,#0d9488 0%,transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle,#0369a1 0%,transparent 65%)" }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-6 px-7 py-8 sm:py-9">
        {/* Left — text */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.32em] text-teal-300">
              Employee Workspace
            </span>
            {roleBadge && (
              <span
                className="rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/90"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                {roleBadge}
              </span>
            )}
          </div>

          <h1 className="text-[1.9rem] font-black leading-tight tracking-tight text-white sm:text-[2.4rem]">
            {overview.title}
          </h1>
          <p className="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-slate-300/80">
            {overview.description}
          </p>

          {/* Quick nav pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { label: "Attendance", href: "/dashboard/attendance", icon: <AttendanceNavIcon /> },
              { label: "Leaves", href: "/dashboard/leaves", icon: <LeavesNavIcon /> },
              { label: "Tasks", href: "/dashboard/tasks", icon: <TasksNavIcon /> },
              { label: "DSR", href: "/dashboard/dsr", icon: <DsrNavIcon /> },
            ].map(nav => (
              <Link
                key={nav.label}
                href={nav.href}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.72rem] font-semibold text-white/85 transition-all hover:text-white"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.22)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(45,212,191,0.3)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
                }}
              >
                <span className="text-teal-300">{nav.icon}</span>
                {nav.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right — floating status card */}
        <div
          className="hidden shrink-0 rounded-2xl p-5 lg:block"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            minWidth: 180,
          }}
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-teal-300">Today&apos;s Status</p>
          <div className="mt-3 space-y-2.5">
            <StatusRow dot="#22c55e" label="System" value="Online" />
            <StatusRow dot="#f59e0b" label="DSR" value="Pending" />
            <StatusRow dot="#3b82f6" label="Session" value="Active" />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-12"
        style={{ background: "linear-gradient(to top,rgba(4,15,26,0.35),transparent)" }}
      />
    </section>
  );
}

function StatusRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dot, boxShadow: `0 0 6px 2px ${dot}55` }} />
        <span className="text-[0.7rem] text-white/55">{label}</span>
      </div>
      <span className="text-[0.7rem] font-semibold text-white/85">{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STAT CARDS
══════════════════════════════════════════════════════════════════════ */
function StatCard({
  accent,
  card,
  index,
}: {
  accent: (typeof CARD_ACCENTS)[number];
  card: SummaryCard;
  index: number;
}) {
  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        border: "1px solid #e8eef5",
        borderTop: `3px solid ${accent.from}`,
        boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
      }}
    >
      {/* Subtle gradient bg on hover */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at top left, ${accent.bg} 0%, transparent 60%)` }}
      />

      <div className="relative px-5 py-4">
        {/* Icon + label row */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[0.65rem] font-bold uppercase tracking-[0.26em]"
            style={{ color: accent.text }}
          >
            {card.label}
          </span>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
          >
            <MetricIcon index={index} color={accent.text} />
          </span>
        </div>

        {/* Value */}
        <p className="mt-3 text-[2rem] font-black leading-none tracking-tight text-slate-900">
          {card.value}
        </p>

        {/* Detail */}
        <p className="mt-2 text-[0.82rem] leading-snug text-slate-500">{card.detail}</p>

        {/* Bottom bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
          style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
        />
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   WORK CENTER
══════════════════════════════════════════════════════════════════════ */
function WorkCenterPanel({
  actionEmptyMessage,
  actions,
  emptyMessage,
  items,
  title,
}: {
  actionEmptyMessage: string;
  actions: DashboardListItem[];
  emptyMessage: string;
  items: DashboardListItem[];
  title: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-3xl bg-white"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
        style={{
          background: "linear-gradient(135deg,#f8fbff 0%,#ffffff 100%)",
          borderBottom: "1px solid #eef2f7",
        }}
      >
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-teal-600">{title}</p>
          <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">Work Center</h2>
          <p className="mt-1 text-[0.82rem] text-slate-500">Today&apos;s tasks and important actions in one place.</p>
        </div>
        <Link
          href="/dashboard/tasks"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)" }}
        >
          <span>Open Tasks</span>
          <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Body */}
      <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Tasks */}
        <div>
          {items.length ? (
            <div className="space-y-3">
              {items.map((item, i) => (
                <TaskCard item={item} key={item.id} accent={TASK_ACCENT_COLORS[i % TASK_ACCENT_COLORS.length]!} />
              ))}
            </div>
          ) : (
            <EmptyTaskState message={emptyMessage} />
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <p
            className="mb-4 text-[0.65rem] font-bold uppercase tracking-[0.28em]"
            style={{ color: "#0d9488" }}
          >
            Quick Actions
          </p>
          <div className="space-y-3">
            {actions.length ? (
              actions.map((item, i) => (
                <QuickActionCard item={item} key={item.id} index={i} />
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                {actionEmptyMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const TASK_ACCENT_COLORS = [
  { dot: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)" },
  { dot: "#8b5cf6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)" },
  { dot: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" },
  { dot: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.15)" },
];

function TaskCard({ item, accent }: { item: DashboardListItem; accent: (typeof TASK_ACCENT_COLORS)[number] }) {
  return (
    <article
      className="group rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accent.dot }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em]"
              style={{ background: "rgba(255,255,255,0.7)", color: "#64748b", border: "1px solid rgba(0,0,0,0.07)" }}
            >
              {item.meta}
            </span>
          </div>
          <h3 className="mt-2 text-[0.95rem] font-bold text-slate-900">{item.title}</h3>
          <p className="mt-1 text-[0.82rem] leading-snug text-slate-500">{item.description}</p>
        </div>
      </div>
    </article>
  );
}

const QUICK_ACTION_CONFIG = [
  { id: "attendance", href: "/dashboard/attendance", gradient: "linear-gradient(135deg,#0d9488,#0891b2)", icon: <AttendanceNavIcon /> },
  { id: "dsr",        href: "/dashboard/dsr",        gradient: "linear-gradient(135deg,#7c3aed,#a855f7)", icon: <DsrNavIcon /> },
  { id: "leave",      href: "/dashboard/leaves",     gradient: "linear-gradient(135deg,#d97706,#f59e0b)", icon: <LeavesNavIcon /> },
];

function QuickActionCard({ item, index }: { item: DashboardListItem; index: number }) {
  const config = QUICK_ACTION_CONFIG[index] ?? { href: "/dashboard", gradient: "linear-gradient(135deg,#475569,#64748b)", icon: <TasksNavIcon /> };
  return (
    <Link
      href={getFocusHref(item.id) || config.href}
      className="group flex items-start gap-3.5 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ border: "1px solid #e2e8f0", background: "#ffffff" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ background: config.gradient }}
      >
        {config.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.88rem] font-bold text-slate-900">{item.title}</p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider"
            style={{ background: "rgba(13,148,136,0.1)", color: "#0d9488" }}
          >
            {item.meta}
          </span>
        </div>
        <p className="mt-0.5 text-[0.78rem] leading-snug text-slate-500">{item.description}</p>
      </div>
      <svg
        className="mt-1 shrink-0 text-slate-300 transition group-hover:text-teal-500 group-hover:translate-x-0.5"
        fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   WEEKLY PULSE
══════════════════════════════════════════════════════════════════════ */
const PULSE_ACCENTS = [
  { label: "", bar: "#0d9488", bg: "rgba(13,148,136,0.07)" },
  { label: "", bar: "#8b5cf6", bg: "rgba(139,92,246,0.07)" },
  { label: "", bar: "#3b82f6", bg: "rgba(59,130,246,0.07)" },
  { label: "", bar: "#f59e0b", bg: "rgba(245,158,11,0.07)" },
  { label: "", bar: "#ef4444", bg: "rgba(239,68,68,0.07)" },
  { label: "", bar: "#10b981", bg: "rgba(16,185,129,0.07)" },
];

function WeeklyPulsePanel({ cards, title }: { cards: SummaryCard[]; title: string }) {
  return (
    <section
      className="rounded-3xl bg-white"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}
    >
      <div className="px-6 pt-6 pb-2">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-teal-600">{title}</p>
        <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">Weekly Pulse</h2>
        <p className="mt-1 text-[0.82rem] text-slate-500">Your performance snapshot for this week.</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.length ? (
          cards.map((card, i) => {
            const a = PULSE_ACCENTS[i % PULSE_ACCENTS.length]!;
            const numericVal = parseFloat(String(card.value).replace(/[^0-9.]/g, ""));
            const barWidth = isNaN(numericVal) ? 0 : Math.min(100, (numericVal / 7) * 100);
            return (
              <article
                key={card.label}
                className="group rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: a.bg, border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                <p className="mt-3 text-[2rem] font-black leading-none tracking-tight text-slate-900">{card.value}</p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/6">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%`, background: a.bar }}
                  />
                </div>
                <p className="mt-2 text-[0.78rem] leading-snug text-slate-500">{card.detail}</p>
              </article>
            );
          })
        ) : (
          <div className="col-span-3">
            <EmptyState message="Weekly summary will appear here after activity is recorded." />
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════════════ */
const NOTIF_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  default: { bg: "rgba(59,130,246,0.08)", text: "#2563eb", dot: "#3b82f6" },
  task:    { bg: "rgba(139,92,246,0.08)", text: "#7c3aed", dot: "#8b5cf6" },
  project: { bg: "rgba(13,148,136,0.08)", text: "#0d9488", dot: "#0d9488" },
  leave:   { bg: "rgba(245,158,11,0.08)", text: "#d97706", dot: "#f59e0b" },
  alert:   { bg: "rgba(239,68,68,0.08)",  text: "#dc2626", dot: "#ef4444" },
};

function NotificationPanel({ items, title }: { items: DashboardNotificationItem[]; title: string }) {
  return (
    <section
      className="rounded-3xl bg-white"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}
    >
      <div
        className="flex items-center justify-between px-6 pt-6 pb-4"
        style={{ borderBottom: "1px solid #f1f5f9" }}
      >
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-teal-600">{title}</p>
          <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">Updates</h2>
        </div>
        {items.length > 0 && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[0.72rem] font-black text-white"
            style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}
          >
            {items.length}
          </span>
        )}
      </div>

      <div className="space-y-3 p-5">
        {items.length ? (
          items.map((item) => {
            const key = item.meta?.toLowerCase() ?? "default";
            const c = NOTIF_COLORS[key] ?? NOTIF_COLORS.default!;
            return (
              <Link
                key={item.id}
                href={item.actionUrl || "/dashboard"}
                className="group flex items-start gap-3.5 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: c.bg, border: "1px solid rgba(0,0,0,0.05)" }}
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.dot, boxShadow: `0 0 0 3px ${c.dot}22` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider"
                      style={{ background: "rgba(255,255,255,0.8)", color: c.text, border: `1px solid ${c.dot}33` }}
                    >
                      {item.meta}
                    </span>
                  </div>
                  <h3 className="mt-2 text-[0.88rem] font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-[0.78rem] leading-snug text-slate-500">{item.detail}</p>
                </div>
                <svg
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:text-teal-500 group-hover:translate-x-0.5"
                  fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            );
          })
        ) : (
          <EmptyState message="No new notifications. Everything is up to date." />
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════════════════ */
const CALENDAR_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  leave:     { bg: "rgba(245,158,11,0.1)", text: "#d97706" },
  task:      { bg: "rgba(59,130,246,0.1)", text: "#2563eb" },
  meeting:   { bg: "rgba(139,92,246,0.1)", text: "#7c3aed" },
  holiday:   { bg: "rgba(16,185,129,0.1)", text: "#059669" },
  project:   { bg: "rgba(13,148,136,0.1)", text: "#0d9488" },
  default:   { bg: "rgba(100,116,139,0.1)", text: "#475569" },
};

function CalendarPanel({ items, title }: { items: CalendarEventItem[]; title: string }) {
  return (
    <section
      className="rounded-3xl bg-white"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}
    >
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-teal-600">{title}</p>
        <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">Upcoming Items</h2>
      </div>

      <div className="space-y-3 p-5">
        {items.length ? (
          items.map((item) => {
            const key = item.type?.toLowerCase() ?? "default";
            const c = CALENDAR_TYPE_COLORS[key] ?? CALENDAR_TYPE_COLORS.default!;
            return (
              <article
                key={item.id}
                className="flex items-start gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ border: "1px solid #eef2f7", background: "#f8fbff" }}
              >
                {/* Date bubble */}
                <div
                  className="flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2.5 text-center"
                  style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)", minWidth: 52 }}
                >
                  <span className="text-[1.2rem] font-black leading-none text-white">
                    {item.date?.split("-")[2] ?? "–"}
                  </span>
                  <span className="mt-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white/70">
                    {getShortMonth(item.date)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {item.type}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[0.9rem] font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-0.5 text-[0.78rem] text-slate-500">{item.detail}</p>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState message="No upcoming events in your current schedule." />
        )}
      </div>
    </section>
  );
}

function getShortMonth(date: string) {
  if (!date) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = parseInt(date.split("-")[1] ?? "0", 10) - 1;
  return months[m] ?? "";
}

/* ══════════════════════════════════════════════════════════════════════
   PERFORMANCE PANEL
══════════════════════════════════════════════════════════════════════ */
function PerformancePanel({ rows, title }: { rows: PerformanceScoreRow[]; title: string }) {
  const row = rows[0];

  return (
    <section
      className="rounded-3xl bg-white"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}
    >
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-teal-600">{title}</p>
        <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">My Score</h2>
      </div>

      {row ? (
        <div className="p-5 space-y-5">
          {/* Score card */}
          <div
            className="flex items-center justify-between gap-4 rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg,#f0fdfa 0%,#ffffff 60%,#f8fafc 100%)", border: "1px solid #ccfbf1" }}
          >
            <div>
              <p className="text-[0.72rem] text-slate-500">{row.employeeEmail}</p>
              <p className="mt-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-400">Overall Score</p>
              <p className="mt-1 text-[2.4rem] font-black leading-none tracking-tight text-slate-900">
                {row.score}
                <span className="ml-1 text-[1rem] font-semibold text-slate-400">/100</span>
              </p>
            </div>

            {/* Score ring */}
            <ScoreRing score={row.score} />
          </div>

          {/* 3 metric bars */}
          <div className="space-y-4">
            <PerformanceBar label="Attendance" value={row.attendanceRate} color="#0d9488" />
            <PerformanceBar label="Task Completion" value={row.taskCompletionRate} color="#3b82f6" />
            <PerformanceBar label="DSR Consistency" value={row.dsrConsistencyRate} color="#8b5cf6" />
          </div>

          {/* Link */}
          <Link
            href="/dashboard/reports"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[0.75rem] font-bold uppercase tracking-[0.2em] text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)" }}
          >
            View Full Report
            <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="p-5">
          <EmptyState message="Performance score will appear once enough activity is recorded." />
        </div>
      )}
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;
  const color = score >= 70 ? "#0d9488" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative shrink-0">
      <svg height="90" width="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
        <circle
          cx="45" cy="45" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.1rem] font-black leading-none text-slate-900">{score}</span>
        <span className="text-[0.55rem] font-bold text-slate-400">pts</span>
      </div>
    </div>
  );
}

function PerformanceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[0.75rem] font-semibold text-slate-600">{label}</span>
        <span className="text-[0.75rem] font-black" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EMPTY STATES
══════════════════════════════════════════════════════════════════════ */
function EmptyTaskState({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-4 rounded-2xl border border-dashed p-5"
      style={{ borderColor: "#cbd5e1", background: "#f8fafc" }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow"
        style={{ background: "linear-gradient(135deg,#0d3d5a,#0d9488)" }}
      >
        <TasksNavIcon />
      </span>
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-teal-600">Current Status</p>
        <h3 className="mt-1.5 text-base font-black text-slate-900">No active task assignments</h3>
        <p className="mt-1 text-[0.82rem] text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl border border-dashed p-5 text-center text-[0.82rem] text-slate-400"
      style={{ borderColor: "#cbd5e1", background: "#f8fafc" }}
    >
      {message}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   DSR PRIORITY ALERT
══════════════════════════════════════════════════════════════════════ */
function DsrPriorityAlert({
  actionLabel,
  actionUrl,
  detail,
  onClose,
  title,
}: {
  actionLabel: string;
  actionUrl: string;
  detail: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:right-6 sm:top-5 sm:bottom-auto sm:w-full sm:max-w-md">
      <div
        className="rounded-3xl p-5 shadow-2xl"
        style={{
          background: "linear-gradient(135deg,#fff1f2 0%,#ffffff 45%,#fef2f2 100%)",
          border: "1px solid rgba(239,68,68,0.2)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}
          >
            <AlertIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-red-600">DSR Alert</p>
            <h2 className="mt-1.5 text-[1.1rem] font-black text-slate-900">{title}</h2>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-slate-600">{detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={actionUrl}
                className="rounded-xl px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}
              >
                {actionLabel}
              </Link>
              <button
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-50"
                onClick={onClose}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════════ */
function MetricIcon({ index, color }: { index: number; color: string }) {
  const s = { stroke: color, fill: "none", height: 18, width: 18, strokeWidth: 1.8 };
  if (index % 5 === 0) return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" strokeLinecap="round" />
      <rect height="15.5" rx="2.4" width="17" x="3.5" y="5" />
      <path d="m8.2 15 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (index % 5 === 1) return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M7 7.5h10M7 12h10M7 16.5h6" strokeLinecap="round" />
      <rect height="17" rx="2.4" width="15" x="4.5" y="3.5" />
    </svg>
  );
  if (index % 5 === 2) return (
    <svg viewBox="0 0 24 24" {...s}>
      <rect height="13" rx="2.2" width="16" x="4" y="7" />
      <path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7" />
      <path d="M4 12.5h16M10.5 12.5v2h3v-2" strokeLinejoin="round" />
    </svg>
  );
  if (index % 5 === 3) return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M4 18.5V8.5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8M4 18.5h16" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M5.5 18.5V10M10 18.5V6.5M14.5 18.5v-5M19 18.5V4.5M4.5 19.5h16" strokeLinecap="round" />
    </svg>
  );
}

function AttendanceNavIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" strokeLinecap="round" /><rect height="15.5" rx="2.4" width="17" x="3.5" y="5" /><path d="m8.2 15 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function LeavesNavIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M7 7.5h10M7 12h10M7 16.5h6" strokeLinecap="round" /><rect height="17" rx="2.4" width="15" x="4.5" y="3.5" /></svg>;
}
function TasksNavIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><rect height="13" rx="2.2" width="16" x="4" y="7" /><path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7M4 12.5h16M10.5 12.5v2h3v-2" strokeLinejoin="round" /></svg>;
}
function DsrNavIcon() {
  return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M5.5 18.5V10M10 18.5V6.5M14.5 18.5v-5M19 18.5V4.5M4.5 19.5h16" strokeLinecap="round" /></svg>;
}

function AlertIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M12 7.5v5.5" strokeLinecap="round" />
      <circle cx="12" cy="16.9" fill="currentColor" r="1" />
      <path d="M10.29 4.86 3.82 16.03A2 2 0 0 0 5.55 19h12.9a2 2 0 0 0 1.73-2.97L13.71 4.86a2 2 0 0 0-3.42 0Z" strokeLinejoin="round" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════════════ */
function getFocusHref(id: string) {
  switch (id) {
    case "attendance": return "/dashboard/attendance";
    case "dsr": return "/dashboard/dsr";
    case "leave": return "/dashboard/leaves";
    default: return "/dashboard";
  }
}
