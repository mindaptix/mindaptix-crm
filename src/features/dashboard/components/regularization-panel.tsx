"use client";

import { useActionState, useState } from "react";
import {
  deleteRegularizationRequest,
  reviewRegularizationRequest,
  submitRegularizationRequest,
} from "@/features/dashboard/actions/regularization";
import type { RegularizationPageData, RegularizationEntry } from "@/features/dashboard/types";

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  PENDING:  { bg: "rgba(245,158,11,0.08)",  text: "#d97706", border: "rgba(245,158,11,0.25)",  dot: "#f59e0b" },
  APPROVED: { bg: "rgba(16,185,129,0.08)",  text: "#059669", border: "rgba(16,185,129,0.25)",  dot: "#10b981" },
  REJECTED: { bg: "rgba(239,68,68,0.08)",   text: "#dc2626", border: "rgba(239,68,68,0.25)",   dot: "#ef4444" },
};

const WORK_MODE_LABELS: Record<string, string> = {
  OFFICE: "🏢 Office",
  WFH: "🏠 WFH",
  FIELD: "🚗 Field",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}

type Props = { data: RegularizationPageData };

export function RegularizationPanel({ data }: Props) {
  const [tab, setTab] = useState<"submit" | "mine" | "review">(
    data.canReview ? "review" : "submit"
  );

  const tabs = [
    ...(data.canReview
      ? [
          { key: "review" as const, label: `Review Requests`, count: data.pendingRequests.length },
          { key: "mine" as const, label: "All Requests", count: data.allRequests.length },
        ]
      : [
          { key: "submit" as const, label: "New Request", count: null },
          { key: "mine" as const, label: "My Requests", count: data.myRequests.length },
        ]),
  ];

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Attendance</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">Regularization Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.canReview
              ? "Review and approve employee attendance correction requests."
              : "Missed marking attendance? Submit a regularization request for admin review."}
          </p>
        </div>

        <div className="flex gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              type="button"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {t.label}
              {t.count !== null ? (
                <span className={`rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold ${tab === t.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "submit" && <SubmitForm />}
      {tab === "mine"   && <RequestList entries={data.canReview ? data.allRequests : data.myRequests} canDelete={data.canReview} canReview={false} />}
      {tab === "review" && data.canReview && <RequestList entries={data.pendingRequests} canDelete canReview allEntries={data.allRequests} />}
    </div>
  );
}

// ── Submit form ───────────────────────────────────────────────────────────────

function SubmitForm() {
  const [state, action, pending] = useActionState(submitRegularizationRequest, {});
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">New Request</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Submit Regularization</h2>
        <p className="text-sm text-slate-500">Fill in the details for the day you missed marking attendance.</p>
      </div>

      <form action={action} className="space-y-5 p-5 sm:p-6">
        {state.error   && <FeedbackBanner tone="error">{state.error}</FeedbackBanner>}
        {state.success && <FeedbackBanner tone="success">{state.success}</FeedbackBanner>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Date *" hint="The day you missed marking attendance">
            <input
              className={INPUT}
              max={today}
              name="dateKey"
              required
              type="date"
            />
          </Field>

          <Field label="Work Mode">
            <select className={INPUT} name="workMode" defaultValue="OFFICE">
              <option value="OFFICE">🏢 Office</option>
              <option value="WFH">🏠 Work From Home</option>
              <option value="FIELD">🚗 Field</option>
            </select>
          </Field>

          <Field label="Check-in Time *" hint="Approximate time you arrived / started">
            <input className={INPUT} name="requestedCheckIn" required type="time" />
          </Field>

          <Field label="Check-out Time" hint="Leave blank if you didn't checkout">
            <input className={INPUT} name="requestedCheckOut" type="time" />
          </Field>
        </div>

        <Field label="Reason *" hint="Explain why attendance was not marked (min 5 characters)">
          <textarea
            className={`${INPUT} min-h-[90px] resize-none`}
            name="reason"
            placeholder="e.g. Internet was down so I could not access the portal. I was working from office."
            required
            minLength={5}
          />
        </Field>

        <button
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Submitting…" : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

// ── Request list (employee view + admin review) ───────────────────────────────

function RequestList({
  entries,
  canDelete,
  canReview,
  allEntries,
}: {
  entries: RegularizationEntry[];
  canDelete?: boolean;
  canReview: boolean;
  allEntries?: RegularizationEntry[];
}) {
  const [reviewState, reviewAction, reviewPending] = useActionState(reviewRegularizationRequest, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteRegularizationRequest, {});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (entries.length === 0 && (!allEntries || allEntries.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 text-2xl">📋</div>
        <p className="font-semibold text-slate-600">{canReview ? "No pending requests" : "No requests yet"}</p>
        <p className="mt-1 text-sm text-slate-400">{canReview ? "All regularization requests have been reviewed." : "Submit a request from the 'New Request' tab."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending requests */}
      {entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              {canReview ? "Pending Review" : canDelete ? "All Requests" : "My Requests"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {canReview
                ? `${entries.length} Request${entries.length !== 1 ? "s" : ""} Awaiting Review`
                : canDelete
                  ? "All Regularization Requests"
                  : "Submitted Requests"}
            </h2>
          </div>

          {reviewState.error   && <div className="mx-5 mt-4 sm:mx-6"><FeedbackBanner tone="error">{reviewState.error}</FeedbackBanner></div>}
          {reviewState.success && <div className="mx-5 mt-4 sm:mx-6"><FeedbackBanner tone="success">{reviewState.success}</FeedbackBanner></div>}
          {deleteState.error   && <div className="mx-5 mt-4 sm:mx-6"><FeedbackBanner tone="error">{deleteState.error}</FeedbackBanner></div>}
          {deleteState.success && <div className="mx-5 mt-4 sm:mx-6"><FeedbackBanner tone="success">{deleteState.success}</FeedbackBanner></div>}

          <div className="divide-y divide-slate-200">
            {entries.map((entry) => (
              <div key={entry.id}>
                <div className="flex flex-wrap items-start gap-4 px-5 py-5 sm:px-6">
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
                    style={{ background: "#e0e7ff", color: "#4338ca" }}
                  >
                    {entry.employeeName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    {(canReview || canDelete) && <p className="font-semibold text-slate-800">{entry.employeeName}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Date: {entry.dateKey}</span>
                      <span>Hours: {entry.requestedCheckIn}{entry.requestedCheckOut ? ` — ${entry.requestedCheckOut}` : ""}</span>
                      <span>{WORK_MODE_LABELS[entry.workMode] ?? entry.workMode}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{entry.reason}</p>
                    {entry.reviewNote && (
                      <p className="mt-1.5 text-[0.75rem] text-slate-400">
                        Admin note: {entry.reviewNote}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={entry.status} />
                    {canDelete && (
                      <form action={deleteAction}>
                        <input type="hidden" name="requestId" value={entry.id} />
                        <button
                          className="text-[0.7rem] font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                          disabled={deletePending}
                          onClick={(event) => {
                            if (!window.confirm("Delete this regularization request?")) {
                              event.preventDefault();
                            }
                          }}
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                    {canReview && entry.status === "PENDING" && (
                      <button
                        className="text-[0.7rem] font-semibold text-indigo-600 hover:text-indigo-800"
                        onClick={() => setReviewingId(reviewingId === entry.id ? null : entry.id)}
                        type="button"
                      >
                        {reviewingId === entry.id ? "Cancel" : "Review →"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline review form */}
                {canReview && reviewingId === entry.id && (
                  <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
                    <form action={reviewAction} className="space-y-3">
                      <input type="hidden" name="requestId" value={entry.id} />
                      <Field label="Review Note (optional)">
                        <input className={INPUT} name="reviewNote" placeholder="Add a note for the employee…" />
                      </Field>
                      <div className="flex gap-3">
                        <button
                          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          disabled={reviewPending}
                          name="action"
                          type="submit"
                          value="APPROVED"
                        >
                          {reviewPending ? "…" : "✓ Approve"}
                        </button>
                        <button
                          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          disabled={reviewPending}
                          name="action"
                          type="submit"
                          value="REJECTED"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History (admin all requests) */}
      {canReview && allEntries && allEntries.filter((e) => e.status !== "PENDING").length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
            onClick={() => setHistoryOpen((v) => !v)}
            type="button"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">History</p>
              <h3 className="mt-1 font-semibold text-slate-800">Reviewed Requests ({allEntries.filter((e) => e.status !== "PENDING").length})</h3>
            </div>
            <span className="text-slate-400 transition-transform" style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </button>
          {historyOpen && (
            <div className="divide-y divide-slate-50 border-t border-slate-100">
              {allEntries.filter((e) => e.status !== "PENDING").map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">{entry.employeeName} — <span className="text-slate-400">{entry.dateKey}</span></p>
                    <p className="mt-0.5 text-[0.72rem] text-slate-400 line-clamp-1">{entry.reason}</p>
                  </div>
                  <StatusBadge status={entry.status} />
                  {canDelete && (
                    <form action={deleteAction}>
                      <input type="hidden" name="requestId" value={entry.id} />
                      <button
                        className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        disabled={deletePending}
                        onClick={(event) => {
                          if (!window.confirm("Delete this regularization request?")) {
                            event.preventDefault();
                          }
                        }}
                        type="submit"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
      {hint && <span className="mb-1.5 block text-xs text-slate-500">{hint}</span>}
      {children}
    </label>
  );
}

function FeedbackBanner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const cfg = tone === "error"
    ? { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", text: "#dc2626" }
    : { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", text: "#059669" };
  return (
    <div className="rounded-md border px-4 py-3 text-sm font-medium" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
      {children}
    </div>
  );
}
