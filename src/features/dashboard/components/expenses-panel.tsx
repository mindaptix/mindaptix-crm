"use client";

import { useState, useActionState } from "react";
import type { ReactNode } from "react";
import { submitExpense, reviewExpense, markExpensePaid } from "@/features/dashboard/actions/expenses";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import type { ExpensePageData, ExpenseEntry } from "@/features/dashboard/types";

type ExpensesPanelProps = {
  data: ExpensePageData;
};

const EXPENSE_CATEGORIES = ["TRAVEL", "FOOD", "ACCOMMODATION", "EQUIPMENT", "CLIENT_ENTERTAINMENT", "MOBILE", "INTERNET", "OTHER"];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-amber-100 bg-amber-50 text-amber-700",
  APPROVED: "border-blue-100 bg-blue-50 text-blue-700",
  REJECTED: "border-red-100 bg-red-50 text-red-600",
  PAID: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  TRAVEL: "✈",
  FOOD: "🍽",
  ACCOMMODATION: "🏨",
  EQUIPMENT: "💻",
  CLIENT_ENTERTAINMENT: "🤝",
  MOBILE: "📱",
  INTERNET: "🌐",
  OTHER: "📋",
};

const INIT = { error: undefined, success: undefined };

export function ExpensesPanel({ data }: ExpensesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitState, submitAction, submitPending] = useActionState(submitExpense, INIT);
  const [reviewState, reviewAction, reviewPending] = useActionState(reviewExpense, INIT);
  const [paidState, paidAction, paidPending] = useActionState(markExpensePaid, INIT);

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Page header */}
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_52%,#f8fafc_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-orange-600">Finance</p>
            <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950">Expense Claims</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {data.canReview
                ? "Review and approve expense reimbursement requests from your team."
                : "Submit and track your expense reimbursement requests."}
            </p>
          </div>
          <Button className="shrink-0 sm:w-auto" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Submit Expense"}
          </Button>
        </div>

        {/* Summary metrics */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {data.summaryCards.map((card) => (
            <div className="rounded-[1.2rem] border border-orange-100 bg-white px-4 py-3 shadow-sm" key={card.label}>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-orange-600">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{card.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submit form */}
      {showForm ? (
        <section className="rounded-[1.8rem] border border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-[0_16px_36px_rgba(194,65,12,0.08)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border border-orange-200 bg-orange-50 text-orange-700">
              <ReceiptIcon />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-orange-600">New Claim</p>
              <h3 className="text-base font-semibold text-slate-950">Submit Expense</h3>
            </div>
          </div>

          <form action={submitAction} className="space-y-4">
            {submitState.error ? <Feedback>{submitState.error}</Feedback> : null}
            {submitState.success ? <Feedback tone="success">{submitState.success}</Feedback> : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldShell label="Title">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  name="title"
                  placeholder="e.g. Client visit cab fare"
                  required
                />
              </FieldShell>
              <FieldShell label="Category">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  name="category"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Amount (₹)">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  min="0"
                  name="amount"
                  placeholder="0"
                  required
                  type="number"
                />
              </FieldShell>
              <FieldShell label="Expense Date">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none [color-scheme:light] transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  name="expenseDate"
                  required
                  type="date"
                />
              </FieldShell>
              <FieldShell label="Receipt URL (optional)">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  name="receiptUrl"
                  placeholder="https://..."
                />
              </FieldShell>
              <FieldShell label="Receipt File Name (optional)">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  name="receiptName"
                  placeholder="receipt.pdf"
                />
              </FieldShell>
            </div>

            <FieldShell label="Description (optional)">
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                name="description"
                placeholder="Additional details about this expense..."
              />
            </FieldShell>

            <Button className="sm:w-auto" disabled={submitPending} type="submit">
              {submitPending ? "Submitting..." : "Submit Claim"}
            </Button>
          </form>
        </section>
      ) : null}

      {/* Global feedback */}
      {reviewState.error ? <Feedback>{reviewState.error}</Feedback> : null}
      {reviewState.success ? <Feedback tone="success">{reviewState.success}</Feedback> : null}
      {paidState.error ? <Feedback>{paidState.error}</Feedback> : null}
      {paidState.success ? <Feedback tone="success">{paidState.success}</Feedback> : null}

      {/* Expense list */}
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-orange-600">Claims</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-950">
              {data.canReview ? "All Expense Claims" : "My Expense Claims"}
            </h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            {data.expenses.length} claim{data.expenses.length !== 1 ? "s" : ""}
          </span>
        </div>

        {data.expenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-400">No expense claims found.</p>
            <p className="mt-1 text-xs text-slate-300">Submit a new expense claim to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                canReview={data.canReview}
                expense={expense}
                paidAction={paidAction}
                paidPending={paidPending}
                reviewAction={reviewAction}
                reviewPending={reviewPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ExpenseRow({
  expense,
  canReview,
  reviewAction,
  reviewPending,
  paidAction,
  paidPending,
}: {
  expense: ExpenseEntry;
  canReview: boolean;
  reviewAction: (fd: FormData) => void;
  reviewPending: boolean;
  paidAction: (fd: FormData) => void;
  paidPending: boolean;
}) {
  const [showReview, setShowReview] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const icon = CATEGORY_ICONS[expense.category] ?? "📋";

  return (
    <div className="px-5 py-4 transition hover:bg-slate-50/60 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] border border-orange-100 bg-orange-50 text-lg">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{expense.title}</p>
              <span className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[expense.status] ?? "border-slate-100 bg-slate-50 text-slate-500"}`}>
                {expense.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-slate-500">
                {expense.category.replace(/_/g, " ")}
              </span>
              {canReview ? (
                <span className="text-xs text-slate-500">{expense.employeeName}</span>
              ) : null}
              <span className="text-xs text-slate-400">{expense.expenseDate}</span>
            </div>
            {expense.description ? (
              <p className="mt-1.5 text-sm leading-5 text-slate-600">{expense.description}</p>
            ) : null}
            {expense.reviewNote ? (
              <p className="mt-1 text-xs text-slate-400 italic">Note: {expense.reviewNote}</p>
            ) : null}
            {expense.paidOn ? (
              <p className="mt-1 text-xs font-medium text-emerald-600">Paid on {expense.paidOn}</p>
            ) : null}
          </div>
        </div>
        <p className="text-xl font-semibold text-slate-900">
          ₹{expense.amount.toLocaleString("en-IN")}
        </p>
      </div>

      {/* Review actions */}
      {canReview && expense.status === "PENDING" ? (
        <div className="mt-3 pl-13">
          {showReview ? (
            <form action={reviewAction} className="flex flex-wrap items-center gap-2">
              <input name="expenseId" type="hidden" value={expense.id} />
              <input
                className="min-w-40 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-300"
                name="reviewNote"
                placeholder="Review note (optional)"
              />
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                disabled={reviewPending}
                name="action"
                type="submit"
                value="APPROVED"
              >
                Approve
              </button>
              <button
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                disabled={reviewPending}
                name="action"
                type="submit"
                value="REJECTED"
              >
                Reject
              </button>
              <button
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
                onClick={() => setShowReview(false)}
                type="button"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="text-xs font-semibold text-orange-600 transition hover:text-orange-800"
              onClick={() => setShowReview(true)}
              type="button"
            >
              Review Claim →
            </button>
          )}
        </div>
      ) : null}

      {/* Mark paid action */}
      {canReview && expense.status === "APPROVED" ? (
        <div className="mt-3 pl-13">
          {showMarkPaid ? (
            <form action={paidAction} className="flex flex-wrap items-center gap-2">
              <input name="expenseId" type="hidden" value={expense.id} />
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light]"
                defaultValue={new Date().toISOString().slice(0, 10)}
                name="paidOn"
                type="date"
              />
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                disabled={paidPending}
                type="submit"
              >
                Confirm Payment
              </button>
              <button
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
                onClick={() => setShowMarkPaid(false)}
                type="button"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="text-xs font-semibold text-violet-600 transition hover:text-violet-800"
              onClick={() => setShowMarkPaid(true)}
              type="button"
            >
              Mark as Paid →
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FieldShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ReceiptIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13l-3-2-2 2-2-2-2 2-3-2V5.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M9 9h6M9 12.5h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
