"use client";
import Link from "next/link";

import { useState } from "react";
import { deleteClientPayment } from "../actions";
import type { ClientPaymentEntry } from "../types";
import { ACTION_STYLES, formatCurrency } from "../presentation";
import { StatusBadge } from "./status-badge";
import { RecordInstallmentForm } from "./record-installment-form";

export function PaymentCard({
  payment,
  canManage,
  onEdit,
}: {
  payment: ClientPaymentEntry;
  canManage: boolean;
  onEdit: (p: ClientPaymentEntry) => void;
}) {
  const [showInstallment, setShowInstallment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOverdue = payment.status === "OVERDUE";
  const isPaid = payment.status === "PAID";
  const pct = payment.totalAmount > 0
    ? Math.min(Math.round((payment.receivedAmount / payment.totalAmount) * 100), 100)
    : 0;
  const txCount = payment.transactions?.length ?? 0;

  return (
    <article
      className="overflow-hidden rounded-lg bg-white"
      style={{
        border: isOverdue ? "1px solid #fca5a5" : "1px solid #e2e8f0",
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-[0.95rem] font-semibold text-slate-900">{payment.clientName || "Unknown Client"}</h3>
              {payment.isRecurring ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-violet-700">
                  <svg fill="none" height="8" viewBox="0 0 24 24" width="8"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"/></svg>
                  Recurring
                </span>
              ) : null}
              {payment.recurringParentId ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-sky-700">
                  <svg fill="none" height="8" viewBox="0 0 24 24" width="8"><rect height="18" rx="2" width="14" x="5" y="3" stroke="currentColor" strokeWidth="2.5"/><path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/></svg>
                  Monthly
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[0.72rem] text-slate-500">{payment.projectId ? <Link href={`/dashboard/projects/${payment.projectId}`} className="text-violet-700 hover:underline">{payment.projectName}</Link> : `${payment.projectName || "No project"} · Link required`}</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>
        {payment.invoiceNumber ? (
          <p className="mt-1.5 text-[0.65rem] font-semibold tracking-wider text-slate-400">INV: {payment.invoiceNumber}</p>
        ) : null}
        {payment.isRecurring && payment.recurringDayOfMonth ? (
          <p className="mt-1 flex items-center gap-1 text-[0.63rem] font-semibold text-violet-600">
            <svg fill="none" height="9" viewBox="0 0 24 24" width="9"><rect height="18" rx="2" width="18" x="3" y="4" stroke="currentColor" strokeWidth="2.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/></svg>
            Renews on {payment.recurringDayOfMonth}{["st","nd","rd"][((payment.recurringDayOfMonth + 90) % 100 - 10) % 10 - 1] ?? "th"} of every month
            {payment.recurringEndDate ? ` · until ${payment.recurringEndDate}` : ""}
          </p>
        ) : null}
      </div>

      {/* ── Amount + Progress ── */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Contract Value</span>
          <span className="text-sm font-semibold text-slate-900">{formatCurrency(payment.totalAmount)}</span>
        </div>

        {/* Progress bar with percentage */}
        <div className="relative">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct > 0 ? "#059669" : "#e2e8f0",
              }}
            />
          </div>
          <span className="absolute right-0 top-4 text-[0.58rem] font-semibold text-slate-400">{pct}%</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-emerald-50 px-3 py-2">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-600">Received</p>
            <p className="mt-0.5 text-[0.88rem] font-semibold text-emerald-700">{formatCurrency(payment.receivedAmount)}</p>
          </div>
          <div className={`rounded-md px-3 py-2 ${isOverdue ? "bg-red-50" : "bg-amber-50"}`}>
            <p className={`text-[0.6rem] font-semibold uppercase tracking-wide ${isOverdue ? "text-red-500" : "text-amber-600"}`}>Balance Due</p>
            <p className={`mt-0.5 text-[0.88rem] font-semibold ${isOverdue ? "text-red-700" : "text-amber-700"}`}>
              {payment.balanceDue > 0 ? formatCurrency(payment.balanceDue) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Installment history ── */}
      {txCount > 0 ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            className={`${ACTION_STYLES.neutral} w-full justify-between`}
            aria-expanded={showHistory}
            onClick={() => setShowHistory((v) => !v)}
            type="button"
          >
            <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-slate-600">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[0.55rem] font-semibold text-slate-500">{txCount}</span>
              Installment{txCount !== 1 ? "s" : ""} received
            </span>
            <svg className={`transition-transform ${showHistory ? "rotate-180" : ""}`} fill="none" height="12" viewBox="0 0 24 24" width="12">
              <path d="m6 9 6 6 6-6" stroke="#94a3b8" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </button>

          {showHistory ? (
            <div className="mt-2 space-y-1.5">
              {payment.transactions.slice().reverse().map((tx, i) => (
                <div
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  key={tx.id || i}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <svg fill="none" height="9" viewBox="0 0 24 24" width="9">
                        <path d="M20 12H4M12 4l8 8-8 8" stroke="#10b981" strokeLinecap="round" strokeWidth="2.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[0.68rem] font-semibold text-slate-800">{formatCurrency(tx.txAmount)}</p>
                      {tx.note ? <p className="text-[0.6rem] text-slate-400">{tx.note}</p> : null}
                    </div>
                  </div>
                  <span className="text-[0.6rem] font-semibold text-slate-400">{tx.txDate || tx.createdAt}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Dates + note ── */}
      {(payment.dueDate || payment.receivedDate) ? (
        <div className="border-t border-slate-100 px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
          {payment.dueDate ? (
            <span className={`text-[0.62rem] font-semibold ${isOverdue ? "text-red-600" : "text-slate-400"}`}>Due: {payment.dueDate}</span>
          ) : null}
          {payment.receivedDate ? (
            <span className="text-[0.62rem] font-semibold text-emerald-600">Last payment: {payment.receivedDate}</span>
          ) : null}
        </div>
      ) : null}

      {payment.note ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[0.68rem] leading-4 text-slate-500 line-clamp-2">{payment.note}</p>
        </div>
      ) : null}

      {/* ── Installment form ── */}
      {showInstallment && !isPaid ? (
        <div className="px-4 pb-3">
          <RecordInstallmentForm payment={payment} onClose={() => setShowInstallment(false)} />
        </div>
      ) : null}

      {/* ── Actions ── */}
      {canManage ? (
        <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
          {!isPaid && !showInstallment ? (
            <button
              className={ACTION_STYLES.receive}
              onClick={() => setShowInstallment(true)}
              type="button"
            >
              <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
              Record Payment
            </button>
          ) : null}
          <button
            className={ACTION_STYLES.edit}
            onClick={() => onEdit(payment)}
            type="button"
          >
            Edit
          </button>
          {confirmDelete ? (
            <form action={deleteClientPayment} className="flex gap-2" onSubmit={() => setConfirmDelete(false)}>
              <input name="paymentId" type="hidden" value={payment.id} />
              <button className={ACTION_STYLES.confirmDelete} type="submit">Confirm Delete</button>
              <button className={ACTION_STYLES.neutral} onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
            </form>
          ) : (
            <button
              className={ACTION_STYLES.danger}
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
