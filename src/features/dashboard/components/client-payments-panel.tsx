"use client";

import { useActionState, useEffect, useState } from "react";
import type { ClientPaymentEntry, PaymentsPageData } from "@/features/dashboard/types";
import {
  createClientPayment,
  deleteClientPayment,
  markPaymentReceived,
  updateClientPayment,
  type ClientPaymentFormState,
} from "@/features/dashboard/actions/client-payments";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  PENDING:  { label: "Pending",    bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", dot: "#3b82f6" },
  PARTIAL:  { label: "Partial",    bg: "#fffbeb", text: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
  PAID:     { label: "Paid",       bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7", dot: "#10b981" },
  OVERDUE:  { label: "Overdue",    bg: "#fff1f2", text: "#be123c", border: "#fca5a5", dot: "#ef4444" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ total, received }: { total: number; received: number }) {
  const pct = total > 0 ? Math.min(Math.round((received / total) * 100), 100) : 0;
  const color = pct === 100 ? "#10b981" : pct > 0 ? "#f59e0b" : "#e2e8f0";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: `${color}12`, border: `1px solid ${color}22`, boxShadow: `0 2px 14px ${color}10` }}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10" style={{ background: color }} />
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em]" style={{ color }}>{label}</p>
      <p className="mt-2 text-[1.9rem] font-black leading-none tracking-tight" style={{ color }}>{value}</p>
      {sub ? <p className="mt-2 text-[0.68rem] leading-4 text-slate-500">{sub}</p> : null}
    </div>
  );
}

// ─── Payment form (create / edit) ───────────────────────────────────────────

function PaymentForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: ClientPaymentEntry;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit ? updateClientPayment : createClientPayment;
  const [state, formAction, pending] = useActionState<ClientPaymentFormState, FormData>(action, {
    values: initial
      ? {
          id: initial.id,
          clientName: initial.clientName,
          projectName: initial.projectName,
          invoiceNumber: initial.invoiceNumber,
          amount: String(initial.totalAmount),
          receivedAmount: String(initial.receivedAmount),
          dueDate: initial.dueDate,
          receivedDate: initial.receivedDate,
          status: initial.status,
          note: initial.note,
        }
      : {},
  });

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [state.success, onSuccess]);

  const v = state.values ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input name="paymentId" type="hidden" value={v.id ?? initial?.id ?? ""} />}

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{state.success}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Client Name *</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.clientName ?? ""}
            name="clientName"
            placeholder="e.g. Acme Pvt Ltd"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Name *</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.projectName ?? ""}
            name="projectName"
            placeholder="e.g. E-commerce Website"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Number</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.invoiceNumber ?? ""}
            name="invoiceNumber"
            placeholder="e.g. INV-2024-001"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.status ?? "PENDING"}
            name="status"
          >
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Total Amount (₹) *</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.amount ?? "0"}
            min="0"
            name="amount"
            placeholder="e.g. 80000"
            type="number"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Received Amount (₹)</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.receivedAmount ?? "0"}
            min="0"
            name="receivedAmount"
            placeholder="e.g. 30000"
            type="number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.dueDate ?? ""}
            name="dueDate"
            type="date"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Received Date</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue={v.receivedDate ?? ""}
            name="receivedDate"
            type="date"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Note</label>
        <textarea
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          defaultValue={v.note ?? ""}
          name="note"
          placeholder="Add any relevant payment notes..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : isEdit ? "Update Record" : "Add Payment"}
        </button>
      </div>
    </form>
  );
}

// ─── Quick "Mark Received" form ──────────────────────────────────────────────

function MarkReceivedForm({ payment, onClose }: { payment: ClientPaymentEntry; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(markPaymentReceived, {});
  useEffect(() => { if (state.success) onClose(); }, [state.success, onClose]);

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-900">Mark Payment Received</p>
      <input name="paymentId" type="hidden" value={payment.id} />
      {state.error ? <p className="text-xs font-semibold text-red-600">{state.error}</p> : null}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-emerald-700">Received Amount (₹)</label>
          <input
            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            defaultValue={payment.totalAmount}
            max={payment.totalAmount}
            min={0}
            name="receivedAmount"
            type="number"
          />
        </div>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Confirm"}
        </button>
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition" onClick={onClose} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Payment card ────────────────────────────────────────────────────────────

function PaymentCard({
  payment,
  canManage,
  onEdit,
}: {
  payment: ClientPaymentEntry;
  canManage: boolean;
  onEdit: (p: ClientPaymentEntry) => void;
}) {
  const [showMarkReceived, setShowMarkReceived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOverdue = payment.status === "OVERDUE";
  const isPaid = payment.status === "PAID";

  return (
    <article
      className="overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        border: isOverdue ? "1px solid #fca5a5" : "1px solid #e2e8f0",
        borderTop: `3px solid ${STATUS_CFG[payment.status]?.dot ?? "#3b82f6"}`,
        boxShadow: isOverdue ? "0 4px 18px rgba(239,68,68,0.08)" : "0 4px 14px rgba(15,23,42,0.05)",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[0.95rem] font-bold text-slate-900">{payment.clientName || "Unknown Client"}</h3>
            <p className="mt-0.5 truncate text-[0.72rem] text-slate-500">{payment.projectName || "—"}</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>
        {payment.invoiceNumber ? (
          <p className="mt-1.5 text-[0.65rem] font-semibold tracking-wider text-slate-400">INV: {payment.invoiceNumber}</p>
        ) : null}
      </div>

      {/* Amounts */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">Total</span>
          <span className="text-sm font-black text-slate-900">{formatCurrency(payment.totalAmount)}</span>
        </div>
        <ProgressBar received={payment.receivedAmount} total={payment.totalAmount} />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[0.65rem] text-emerald-600 font-semibold">Received: {formatCurrency(payment.receivedAmount)}</span>
          {payment.balanceDue > 0 ? (
            <span className={`text-[0.65rem] font-bold ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
              Balance: {formatCurrency(payment.balanceDue)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Dates */}
      {(payment.dueDate || payment.receivedDate) ? (
        <div className="border-t border-slate-100 px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {payment.dueDate ? (
            <span className={`text-[0.62rem] font-semibold ${isOverdue ? "text-red-600" : "text-slate-400"}`}>
              Due: {payment.dueDate}
            </span>
          ) : null}
          {payment.receivedDate ? (
            <span className="text-[0.62rem] font-semibold text-emerald-600">Paid on: {payment.receivedDate}</span>
          ) : null}
        </div>
      ) : null}

      {payment.note ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[0.68rem] leading-4 text-slate-500 line-clamp-2">{payment.note}</p>
        </div>
      ) : null}

      {/* Mark received quick form */}
      {showMarkReceived && !isPaid ? (
        <div className="px-4 pb-3">
          <MarkReceivedForm payment={payment} onClose={() => setShowMarkReceived(false)} />
        </div>
      ) : null}

      {/* Actions */}
      {canManage ? (
        <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
          {!isPaid && !showMarkReceived ? (
            <button
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.68rem] font-bold text-emerald-700 hover:bg-emerald-100 transition"
              onClick={() => setShowMarkReceived(true)}
              type="button"
            >
              Mark Received
            </button>
          ) : null}
          <button
            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[0.68rem] font-bold text-blue-700 hover:bg-blue-100 transition"
            onClick={() => onEdit(payment)}
            type="button"
          >
            Edit
          </button>
          {confirmDelete ? (
            <form
              action={deleteClientPayment}
              className="flex gap-2"
              onSubmit={() => setConfirmDelete(false)}
            >
              <input name="paymentId" type="hidden" value={payment.id} />
              <button className="rounded-lg bg-red-600 px-3 py-1.5 text-[0.68rem] font-bold text-white hover:bg-red-700 transition" type="submit">
                Confirm Delete
              </button>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold text-slate-500 hover:bg-slate-50 transition" onClick={() => setConfirmDelete(false)} type="button">
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[0.68rem] font-bold text-red-700 hover:bg-red-100 transition"
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              Delete
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

const FILTERS = ["ALL", "PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;
type Filter = (typeof FILTERS)[number];

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ClientPaymentsPanel({ data }: { data: PaymentsPageData }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");
  const [editTarget, setEditTarget] = useState<ClientPaymentEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = data.payments.filter((p) => activeFilter === "ALL" || p.status === activeFilter);

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

  function handleFormSuccess() {
    setShowForm(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-5 px-3 pb-3 pt-2 sm:px-7 sm:pb-6">

      {/* ── Page header ── */}
      <div className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_30%),linear-gradient(180deg,#fffbeb_0%,#ffffff_45%,#f8fafc_100%)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/75 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">Finance Module</p>
              <h2 className="mt-1.5 text-[1.6rem] font-black tracking-tight text-slate-950">Payment Pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">Track all client invoices, received amounts, and overdue payments.</p>
            </div>
            {data.canManage ? (
              <button
                className="rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)] hover:bg-amber-600 transition"
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
          label="Pending"
          value={String(data.pendingCount)}
          sub="Awaiting first payment"
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
        <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-red-900">
              {data.overdueCount} payment{data.overdueCount !== 1 ? "s are" : " is"} overdue
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              Outstanding: {formatCurrency(data.totalOverdue)} — Follow up with clients immediately.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Add / Edit form ── */}
      {showForm && data.canManage ? (
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
          <h3 className="mb-4 text-base font-bold text-slate-900">
            {editTarget ? "Edit Payment Record" : "Add New Payment Record"}
          </h3>
          <PaymentForm
            initial={editTarget ?? undefined}
            onCancel={() => { setShowForm(false); setEditTarget(null); }}
            onSuccess={handleFormSuccess}
          />
        </div>
      ) : null}

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = filterCounts[f];
          const isActive = f === activeFilter;
          const dot = f === "ALL" ? "#64748b" : STATUS_CFG[f]?.dot ?? "#64748b";
          return (
            <button
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              key={f}
              onClick={() => setActiveFilter(f)}
              type="button"
            >
              {!isActive ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
              {f === "ALL" ? "All" : STATUS_CFG[f]?.label ?? f}
              <span className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Payment cards grid ── */}
      {filtered.length === 0 ? (
        <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
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
