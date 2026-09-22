"use client";

import { DashboardTasks } from "@/features/tasks/components/dashboard-tasks";
import Link from "next/link";
import { useState } from "react";
import { AssignmentAlertBanner } from "@/features/dashboard/components/assignment-alert-banner";
import type { DashboardOverviewData, SummaryCard } from "@/features/dashboard/types";

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
  "border-slate-200 bg-white text-slate-600",
  "border-slate-200 bg-white text-slate-600",
  "border-slate-200 bg-white text-slate-600",
  "border-slate-200 bg-white text-slate-600",
  "border-slate-200 bg-white text-slate-600",
] as const;

export function EmployeeDashboardOverview({ overview, roleBadge }: EmployeeDashboardOverviewProps) {
  const [isPriorityAlertOpen, setIsPriorityAlertOpen] = useState(Boolean(overview.priorityAlert));
  const [isAssignmentBannerOpen, setIsAssignmentBannerOpen] = useState(Boolean(overview.unreadAssignments?.length));

  const topCards = overview.cards.slice(0, 5);
  return (
    <div className="space-y-4 px-3 pb-6 pt-1 font-sans [color-scheme:light] [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans sm:px-6 lg:px-7">
      <DashboardTasks tasks={overview.assignedTasks ?? []} />
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

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-800">Workspace shortcuts</h2>
          <span className="text-xs text-slate-500">{roleBadge}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MAIN_LINKS.map((link) => (
            <Link key={link.id} href={link.href} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 hover:border-violet-200 hover:bg-violet-50/50">
              <span className="text-violet-600">{link.icon}</span>
              <span><span className="block text-sm font-medium text-slate-800">{link.label}</span><span className="text-xs text-slate-500">{link.helper}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {topCards.map((card, index) => (
          <CompactCard card={card} index={index} key={card.label} />
        ))}
      </section>


    </div>
  );
}

function CompactCard({ card, index }: { card: SummaryCard; index: number }) {
  return (
    <article className={`min-w-0 rounded-xl border p-4 shadow-[0_8px_25px_rgba(15,23,42,0.04)] ${CARD_TONES[index % CARD_TONES.length]}`}>
      <p className="truncate text-[0.63rem] font-semibold uppercase tracking-[0.16em] opacity-80">{card.label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950">{card.value}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{card.detail}</p>
    </article>
  );
}

function PriorityAlert({ actionLabel, actionUrl, detail, onClose, title }: { actionLabel: string; actionUrl: string; detail: string; onClose: () => void; title: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-700">{title}</p>
          <p className="mt-1 text-sm text-rose-600">{detail}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white" href={actionUrl}>
            {actionLabel}
          </Link>
          <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-rose-600 ring-1 ring-rose-200" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
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
