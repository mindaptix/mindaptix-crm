"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CalendarEventItem,
  DashboardListItem,
  DashboardNotificationItem,
  DashboardOverviewData,
  PerformanceScoreRow,
  SummaryCard,
} from "@/features/dashboard/types";

type EmployeeDashboardOverviewProps = {
  overview: DashboardOverviewData;
  roleBadge?: string;
};

export function EmployeeDashboardOverview({ overview, roleBadge }: EmployeeDashboardOverviewProps) {
  const [isPriorityAlertOpen, setIsPriorityAlertOpen] = useState(Boolean(overview.priorityAlert));

  return (
    <div className="space-y-5 px-5 pb-5 pt-1 sm:px-7 sm:pb-6">
      {overview.priorityAlert && isPriorityAlertOpen ? (
        <DsrPriorityAlert
          actionLabel={overview.priorityAlert.actionLabel}
          actionUrl={overview.priorityAlert.actionUrl}
          detail={overview.priorityAlert.detail}
          onClose={() => setIsPriorityAlertOpen(false)}
          title={overview.priorityAlert.title}
        />
      ) : null}

      <section className="relative overflow-hidden rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(135deg,#061227_0%,#0b1730_58%,#0b4a7a_100%)] p-6 text-white shadow-[0_18px_42px_rgba(15,23,42,0.14)] sm:p-7">
        <div className="relative max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Employee Workspace</p>
            {roleBadge ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-cyan-50">
                {roleBadge}
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-[2.75rem]">{overview.title}</h1>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-slate-200/80">{overview.description}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {overview.cards.map((card, index) => (
          <SummaryMetricCard accent={index} card={card} key={card.label} />
        ))}
      </section>

      <WorkCenterPanel
        actionEmptyMessage={overview.secondaryEmptyMessage}
        actions={overview.secondaryItems}
        emptyMessage={overview.primaryEmptyMessage}
        items={overview.primaryItems}
        title={overview.primaryListTitle}
      />

      <section className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.88fr)]">
        <WeeklySummaryPanel cards={overview.weeklySummaryCards ?? []} title={overview.weeklySummaryTitle ?? "Weekly Summary"} />
        <NotificationPanel items={overview.notifications ?? []} title={overview.notificationTitle ?? "Notifications"} />
      </section>

      <section className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <CalendarPanel items={overview.calendarItems ?? []} title={overview.calendarTitle ?? "Upcoming Calendar"} />
        <PerformancePanel rows={overview.performanceRows ?? []} title={overview.performanceTitle ?? "Performance"} />
      </section>
    </div>
  );
}

function SummaryMetricCard({ accent, card }: { accent: number; card: SummaryCard }) {
  const accentBarClassName =
    accent % 5 === 0
      ? "from-blue-500 to-cyan-400"
      : accent % 5 === 1
        ? "from-violet-500 to-fuchsia-400"
        : accent % 5 === 2
          ? "from-emerald-500 to-teal-400"
          : accent % 5 === 3
            ? "from-amber-500 to-orange-400"
            : "from-rose-500 to-pink-400";

  return (
    <article className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-[0_18px_34px_rgba(37,99,235,0.07)]">
      <div className={`absolute inset-x-5 top-0 h-1 rounded-full bg-gradient-to-r ${accentBarClassName}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blue-600">{card.label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[0.9rem] border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-600">
          <MetricIcon index={accent} />
        </span>
      </div>
      <p className="mt-4 text-[2rem] font-semibold tracking-tight text-slate-950">{card.value}</p>
      <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">{card.detail}</p>
    </article>
  );
}

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
    <section className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Work Center</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Aaj ke tasks aur important actions ek jagah.</p>
        </div>
        <Link className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 transition hover:bg-blue-100" href="/dashboard/tasks">
          Open Tasks
        </Link>
      </div>

      <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <article className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/35" key={item.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.meta}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <CleanEmptyTaskState message={emptyMessage} />
          )}
        </div>

        <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-500">Quick Actions</p>
          <div className="mt-4 grid gap-3">
            {actions.length ? (
              actions.map((item) => (
                <Link className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40" href={getFocusHref(item.id)} key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-blue-600">{item.meta}</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                </Link>
              ))
            ) : (
              <EmptyState message={actionEmptyMessage} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WeeklySummaryPanel({ cards, title }: { cards: SummaryCard[]; title: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">Weekly Pulse</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.length ? (
          cards.map((card) => (
            <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4" key={card.label}>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
              <p className="mt-3 text-[1.55rem] font-semibold text-slate-950">{card.value}</p>
              <p className="mt-2 text-[0.92rem] leading-6 text-slate-600">{card.detail}</p>
            </article>
          ))
        ) : (
          <EmptyState message="Weekly summary will appear here after activity is recorded." />
        )}
      </div>
    </section>
  );
}

function NotificationPanel({ items, title }: { items: DashboardNotificationItem[]; title: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">Updates</h2>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((item) => (
            <Link
              className="block rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 transition hover:border-blue-200"
              href={item.actionUrl || "/dashboard"}
              key={item.id}
            >
              <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blue-700">
                {item.meta}
              </span>
              <h3 className="mt-3 text-[1.02rem] font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-[0.92rem] leading-6 text-slate-600">{item.detail}</p>
            </Link>
          ))
        ) : (
          <EmptyState message="No notifications right now." />
        )}
      </div>
    </section>
  );
}

function CalendarPanel({ items, title }: { items: CalendarEventItem[]; title: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">Upcoming Items</h2>
      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((item) => (
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {item.date}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.type}
                </span>
              </div>
              <h3 className="mt-3 text-[1.02rem] font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-[0.92rem] leading-6 text-slate-600">{item.detail}</p>
            </article>
          ))
        ) : (
          <EmptyState message="No upcoming events in your current view." />
        )}
      </div>
    </section>
  );
}

function PerformancePanel({ rows, title }: { rows: PerformanceScoreRow[]; title: string }) {
  const row = rows[0];

  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">My Score</h2>
      {row ? (
        <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#f8fafc_100%)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">{row.employeeEmail}</p>
              <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">Score {row.score}</p>
            </div>
            <div className="rounded-[1.4rem] border border-blue-200 bg-white px-5 py-4 text-center shadow-[0_12px_28px_rgba(37,99,235,0.08)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-blue-600">Performance</p>
              <p className="mt-2 text-[2rem] font-semibold text-slate-950">{row.score}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Attendance" value={`${row.attendanceRate}%`} />
            <MiniMetric label="Tasks" value={`${row.taskCompletionRate}%`} />
            <MiniMetric label="DSR" value={`${row.dsrConsistencyRate}%`} />
          </div>
        </div>
      ) : (
        <EmptyState message="Performance score will appear once enough activity is available." />
      )}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function CleanEmptyTaskState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50/80 p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-blue-600 text-white">
          <TaskQueueIcon />
        </span>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-blue-600">Current Status</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">No active task assignments</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">{message}</div>;
}

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
    <div className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:right-6 sm:top-6 sm:bottom-auto sm:w-full sm:max-w-md">
      <div className="rounded-[1.8rem] border border-red-200 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_45%,#fef2f2_100%)] p-5 shadow-[0_24px_60px_rgba(220,38,38,0.18)] backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-red-600 text-white shadow-[0_14px_30px_rgba(220,38,38,0.28)]">
            <AlertIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-red-600">DSR Alert</p>
            <h2 className="mt-2 text-[1.2rem] font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-red-700"
                href={actionUrl}
              >
                {actionLabel}
              </Link>
              <button
                className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-50"
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

function MetricIcon({ index }: { index: number }) {
  if (index % 5 === 0) {
    return (
      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        <rect height="15.5" rx="2.4" stroke="currentColor" strokeWidth="1.7" width="17" x="3.5" y="5" />
        <path d="m8.2 15 2 2 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    );
  }

  if (index % 5 === 1) {
    return (
      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path d="M7 7.5h10M7 12h10M7 16.5h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        <rect height="17" rx="2.4" stroke="currentColor" strokeWidth="1.7" width="15" x="4.5" y="3.5" />
      </svg>
    );
  }

  if (index % 5 === 2) {
    return <TaskQueueIcon />;
  }

  if (index % 5 === 3) {
    return (
      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path d="M4 18.5V8.5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M4 18.5h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M5.5 18.5V10M10 18.5V6.5M14.5 18.5v-5M19 18.5V4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M4.5 19.5h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function TaskQueueIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <rect height="13" rx="2.2" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="7" />
      <path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 12.5h16" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.5 12.5v2h3v-2" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M12 7.5v5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="16.9" fill="currentColor" r="1" />
      <path
        d="M10.29 4.86 3.82 16.03A2 2 0 0 0 5.55 19h12.9a2 2 0 0 0 1.73-2.97L13.71 4.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getFocusHref(id: string) {
  switch (id) {
    case "attendance":
      return "/dashboard/attendance";
    case "dsr":
      return "/dashboard/dsr";
    case "leave":
      return "/dashboard/leaves";
    default:
      return "/dashboard";
  }
}
