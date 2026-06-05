"use client";

import Link from "next/link";
import { useState } from "react";
import { AssignmentAlertBanner } from "@/features/dashboard/components/assignment-alert-banner";
import type { DashboardListItem, DashboardOverviewData, SummaryCard } from "@/features/dashboard/types";

type EmployeeDashboardOverviewProps = {
  overview: DashboardOverviewData;
  roleBadge?: string;
};

const MAIN_LINKS = [
  { id: "attendance", label: "Attendance", href: "/dashboard/attendance", helper: "Check in / out", icon: <AttendanceIcon /> },
  { id: "tasks", label: "Tasks", href: "/dashboard/tasks", helper: "Assigned work", icon: <TasksIcon /> },
  { id: "dsr", label: "DSR", href: "/dashboard/dsr", helper: "Daily report", icon: <DsrIcon /> },
  { id: "leave", label: "Leaves", href: "/dashboard/leaves", helper: "Requests", icon: <LeavesIcon /> },
] as const;

const CARD_TONES = [
  "border-emerald-100 bg-white text-emerald-700",
  "border-emerald-100 bg-white text-emerald-700",
  "border-emerald-100 bg-white text-emerald-700",
  "border-emerald-100 bg-white text-emerald-700",
  "border-emerald-100 bg-white text-emerald-700",
] as const;

export function EmployeeDashboardOverview({ overview, roleBadge }: EmployeeDashboardOverviewProps) {
  const [isPriorityAlertOpen, setIsPriorityAlertOpen] = useState(Boolean(overview.priorityAlert));
  const [isAssignmentBannerOpen, setIsAssignmentBannerOpen] = useState(Boolean(overview.unreadAssignments?.length));

  const topCards = overview.cards.slice(0, 5);
  return (
    <div className="space-y-4 px-3 pb-6 pt-1 sm:px-6 lg:px-7">
      {isAssignmentBannerOpen && overview.unreadAssignments && overview.unreadAssignments.length > 0 && (
        <AssignmentAlertBanner assignments={overview.unreadAssignments} onDismiss={() => setIsAssignmentBannerOpen(false)} />
      )}

      {overview.priorityAlert && isPriorityAlertOpen && (
        <PriorityAlert
          actionLabel={overview.priorityAlert.actionLabel}
          actionUrl={overview.priorityAlert.actionUrl}
          detail={overview.priorityAlert.detail}
          onClose={() => setIsPriorityAlertOpen(false)}
          title={overview.priorityAlert.title}
        />
      )}

      <section className="overflow-hidden rounded-[1.6rem] border border-emerald-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.09)]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="relative min-w-0 overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-5 py-7 text-white sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0,transparent_38%),radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.22),transparent_26%)]" />

            <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/30 bg-white/18 px-3.5 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur">
                Workspace
              </span>
              {roleBadge && (
                <span className="rounded-full border border-white/30 bg-white px-3.5 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
                  {roleBadge}
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-full text-3xl font-black tracking-tight text-white sm:text-4xl">{overview.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/95 sm:text-[0.95rem]">{overview.description}</p>

            <div className="mt-6 h-1.5 w-28 rounded-full bg-white/80 shadow-[0_0_24px_rgba(255,255,255,0.45)]" />
            </div>
          </div>

          <div className="min-w-0 border-t border-emerald-100 bg-[linear-gradient(135deg,#f8fffb,#eefcf6)] p-4 sm:p-5 xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-700">Quick Navigation</p>
              <span className="rounded-full bg-white px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-slate-400 ring-1 ring-emerald-100">
                Direct
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {MAIN_LINKS.map((link) => (
                <Link
                  className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-3.5 py-3.5 shadow-[0_8px_22px_rgba(16,185,129,0.07)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_28px_rgba(16,185,129,0.13)]"
                  href={link.href}
                  key={link.id}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_8px_18px_rgba(13,148,136,0.25)]">{link.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950">{link.label}</span>
                      <span className="block truncate text-xs text-slate-500">{link.helper}</span>
                    </span>
                  </span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {topCards.map((card, index) => (
          <CompactCard card={card} index={index} key={card.label} />
        ))}
      </section>

      <section className="min-w-0">
        <TaskPanel emptyMessage={overview.primaryEmptyMessage} items={overview.primaryItems} title={overview.primaryListTitle} />
      </section>
    </div>
  );
}

function CompactCard({ card, index }: { card: SummaryCard; index: number }) {
  return (
    <article className={`min-w-0 rounded-xl border p-4 shadow-[0_8px_25px_rgba(15,23,42,0.04)] ${CARD_TONES[index % CARD_TONES.length]}`}>
      <p className="truncate text-[0.63rem] font-black uppercase tracking-[0.16em] opacity-80">{card.label}</p>
      <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">{card.value}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{card.detail}</p>
    </article>
  );
}

function TaskPanel({ emptyMessage, items, title }: { emptyMessage: string; items: DashboardListItem[]; title: string }) {
  return (
    <section className="min-w-0 rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Focus List</h2>
        </div>
        <Link className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" href="/dashboard/tasks">
          Tasks
        </Link>
      </div>

      <div className="grid gap-2 p-4">
        {items.length ? (
          items.slice(0, 5).map((item) => (
            <Link
              className="group min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/35 px-4 py-3 transition hover:border-emerald-300 hover:bg-white"
              href="/dashboard/tasks"
              key={item.id}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{item.description}</p>
                </div>
                <span className="max-w-[45%] shrink-0 truncate rounded-full bg-white px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-slate-500 ring-1 ring-slate-200">
                  {item.meta}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </div>
    </section>
  );
}

function PriorityAlert({ actionLabel, actionUrl, detail, onClose, title }: { actionLabel: string; actionUrl: string; detail: string; onClose: () => void; title: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-rose-700">{title}</p>
          <p className="mt-1 text-sm text-rose-600">{detail}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link className="rounded-full bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-white" href={actionUrl}>
            {actionLabel}
          </Link>
          <button className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-rose-600 ring-1 ring-rose-200" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="text-sm font-black text-slate-700">No active work</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24" width="15">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="17">
      <path d="M8 3v4M16 3v4M4 10h16" />
      <rect height="16" rx="2.5" width="16" x="4" y="5" />
      <path d="m8.5 15 2 2 5-5" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="17">
      <rect height="14" rx="2.5" width="16" x="4" y="6" />
      <path d="M8 11h8M8 15h5M9 6V4h6v2" />
    </svg>
  );
}

function DsrIcon() {
  return (
    <svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="17">
      <path d="M5 19V9M10 19V5M15 19v-7M20 19V7M4 20h17" />
    </svg>
  );
}

function LeavesIcon() {
  return (
    <svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="17">
      <rect height="17" rx="2.5" width="14" x="5" y="3.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
