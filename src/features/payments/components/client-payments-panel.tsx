"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientPaymentEntry, PaymentsPageData } from "../types";
import { ACTION_STYLES, STATUS_CFG, formatCurrency } from "../presentation";
import { StatCard } from "./stat-card";
import { PaymentCard } from "./payment-card";
import { PaymentModal } from "./payment-modal";

const FILTERS = ["ALL", "PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;
type Filter = (typeof FILTERS)[number];

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ClientPaymentsPanel({ data }: { data: PaymentsPageData }) {
  const router = useRouter();
  const suggestions = data.projectSuggestions ?? [];
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");
  const [editTarget, setEditTarget] = useState<ClientPaymentEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");

  const filtered = data.payments.filter((p) => (activeFilter === "ALL" || p.status === activeFilter) && (!projectFilter || (projectFilter === "unlinked" ? !p.projectId : p.projectId === projectFilter)));

  const filterCounts: Record<Filter, number> = {
    ALL: data.payments.length,
    PENDING: data.pendingCount,
    PARTIAL: data.partialCount,
    PAID: data.paidCount,
    OVERDUE: data.overdueCount,
  };

  function openCreate() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(p: ClientPaymentEntry) {
    setEditTarget(p);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-5 px-3 pb-3 pt-2 sm:px-7 sm:pb-6">
      <label className="block text-sm font-medium text-slate-600">Filter by project<select className="crm-input mt-2 max-w-sm" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="">All projects</option><option value="unlinked">Needs project link</option>{suggestions.map((project) => <option value={project.id} key={project.id}>{project.projectName}</option>)}</select></label>

      {/* ── Page header ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                className={`${ACTION_STYLES.neutral} mb-3`}
                onClick={() => router.back()}
                type="button"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                  <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </span>
                Back
              </button>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Finance</p>
              <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-tight text-slate-950">Payments</h2>
              <p className="mt-1 text-sm text-slate-500">Track all client invoices, received amounts, and overdue payments.</p>
            </div>
            {data.canManage ? (
              <button
                className={ACTION_STYLES.primary}
                onClick={openCreate}
                type="button"
              >
                + Add Payment Record
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Collected"
          value={formatCurrency(data.totalCollected)}
          sub={`${data.paidCount} fully paid · ${data.partialCount} partial`}
          color="#10b981"
        />
        <StatCard
          label="Balance Due"
          value={formatCurrency(data.totalBalance)}
          sub="Across all active records"
          color="#3b82f6"
        />
        <StatCard
          label="Pending Amount"
          value={formatCurrency(data.totalPending)}
          sub={`${data.pendingCount} awaiting first payment`}
          color="#f59e0b"
        />
        <StatCard
          label="Overdue"
          value={String(data.overdueCount)}
          sub={data.overdueCount > 0 ? `${formatCurrency(data.totalOverdue)} outstanding` : "All on track"}
          color={data.overdueCount > 0 ? "#ef4444" : "#64748b"}
        />
      </div>

      {/* ── Overdue alert ── */}
      {data.overdueCount > 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-100">
            <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-900">
              {data.overdueCount} payment{data.overdueCount !== 1 ? "s are" : " is"} overdue
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              Outstanding: {formatCurrency(data.totalOverdue)} — Follow up with clients immediately.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Payment modal ── */}
      {showForm && data.canManage ? (
        <PaymentModal
          initial={editTarget ?? undefined}
          onClose={closeForm}
          onSuccess={closeForm}
          suggestions={suggestions}
        />
      ) : null}

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = filterCounts[f];
          const isActive = f === activeFilter;
          const dot = f === "ALL" ? "#64748b" : STATUS_CFG[f]?.dot ?? "#64748b";
          return (
            <button
              className={`flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              aria-pressed={isActive}
              key={f}
              onClick={() => setActiveFilter(f)}
              type="button"
            >
              {!isActive ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
              {f === "ALL" ? "All" : STATUS_CFG[f]?.label ?? f}
              <span className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Payment cards grid ── */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm font-semibold text-slate-400">
            {data.payments.length === 0
              ? "No payment records yet. Click \"Add Payment Record\" to get started."
              : `No ${activeFilter.toLowerCase()} payments found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((payment) => (
            <PaymentCard
              canManage={data.canManage}
              key={payment.id}
              onEdit={openEdit}
              payment={payment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
