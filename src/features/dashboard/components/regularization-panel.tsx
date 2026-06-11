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
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider"
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

      {/* Hero header */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)", boxShadow: "0 12px 40px rgba(37,99,235,0.3)" }}
      >
        <div className="px-7 py-6">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-blue-200">Attendance</p>
          <h1 className="mt-1 text-2xl font-black text-white">Regularization Requests</h1>
          <p className="mt-1 text-[0.78rem] text-blue-200">
            {data.canReview
              ? "Review and approve employee attendance correction requests."
              : "Missed marking attendance? Submit a regularization request for admin review."}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-t border-white/10 bg-white/5 px-5 py-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              type="button"
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.key ? "bg-white text-blue-700 shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.label}
              {t.count !== null ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${tab === t.key ? "bg-blue-100 text-blue-700" : "bg-white/20 text-white"}`}>
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
    <div
      className="overflow-hidden rounded-[1.8rem]"
      style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
    >
      <div className="px-7 py-5" style={{ background: "linear-gradient(135deg,#f8faff,#eef4ff)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>New Request</p>
        <h2 className="mt-0.5 text-xl font-bold text-slate-900">Submit Regularization</h2>
        <p className="text-sm text-slate-500">Fill in the details for the day you missed marking attendance.</p>
      </div>

      <form action={action} className="space-y-5 p-7">
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
          className="rounded-2xl px-7 py-3 text-sm font-bold text-white transition disabled:opacity-50"
          disabled={pending}
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
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
      <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>📋</div>
        <p className="font-semibold text-slate-600">{canReview ? "No pending requests" : "No requests yet"}</p>
        <p className="mt-1 text-sm text-slate-400">{canReview ? "All regularization requests have been reviewed." : "Submit a request from the 'New Request' tab."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending requests */}
      {entries.length > 0 && (
        <div className="overflow-hidden rounded-[1.8rem]" style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}>
          <div className="px-7 py-5" style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#d97706" }}>
              {canReview ? "Pending Review" : canDelete ? "All Requests" : "My Requests"}
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900">
              {canReview
                ? `${entries.length} Request${entries.length !== 1 ? "s" : ""} Awaiting Review`
                : canDelete
                  ? "All Regularization Requests"
                  : "Submitted Requests"}
            </h2>
          </div>

          {reviewState.error   && <div className="mx-7 mt-4"><FeedbackBanner tone="error">{reviewState.error}</FeedbackBanner></div>}
          {reviewState.success && <div className="mx-7 mt-4"><FeedbackBanner tone="success">{reviewState.success}</FeedbackBanner></div>}
          {deleteState.error   && <div className="mx-7 mt-4"><FeedbackBanner tone="error">{deleteState.error}</FeedbackBanner></div>}
          {deleteState.success && <div className="mx-7 mt-4"><FeedbackBanner tone="success">{deleteState.success}</FeedbackBanner></div>}

          <div className="divide-y divide-slate-50">
            {entries.map((entry) => (
              <div key={entry.id}>
                <div className="flex flex-wrap items-start gap-4 px-7 py-5">
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}
                  >
                    {entry.employeeName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    {(canReview || canDelete) && <p className="font-semibold text-slate-800">{entry.employeeName}</p>}
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[0.75rem] text-slate-500">
                      <span>📅 {entry.dateKey}</span>
                      <span>🕐 {entry.requestedCheckIn}{entry.requestedCheckOut ? ` — ${entry.requestedCheckOut}` : ""}</span>
                      <span>{WORK_MODE_LABELS[entry.workMode] ?? entry.workMode}</span>
                    </div>
                    <p className="mt-2 text-[0.82rem] text-slate-600">{entry.reason}</p>
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
                  <div className="border-t border-slate-50 bg-slate-50/60 px-7 py-5">
                    <form action={reviewAction} className="space-y-3">
                      <input type="hidden" name="requestId" value={entry.id} />
                      <Field label="Review Note (optional)">
                        <input className={INPUT} name="reviewNote" placeholder="Add a note for the employee…" />
                      </Field>
                      <div className="flex gap-3">
                        <button
                          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                          disabled={reviewPending}
                          name="action"
                          style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                          type="submit"
                          value="APPROVED"
                        >
                          {reviewPending ? "…" : "✓ Approve"}
                        </button>
                        <button
                          className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
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
        <div className="overflow-hidden rounded-[1.8rem]" style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 4px 20px rgba(15,23,42,0.05)" }}>
          <button
            className="flex w-full items-center justify-between px-7 py-4 text-left"
            onClick={() => setHistoryOpen((v) => !v)}
            type="button"
          >
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-slate-400">History</p>
              <h3 className="mt-0.5 font-bold text-slate-800">Reviewed Requests ({allEntries.filter((e) => e.status !== "PENDING").length})</h3>
            </div>
            <span className="text-slate-400 transition-transform" style={{ transform: historyOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </button>
          {historyOpen && (
            <div className="divide-y divide-slate-50 border-t border-slate-100">
              {allEntries.filter((e) => e.status !== "PENDING").map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-4 px-7 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">{entry.employeeName} — <span className="text-slate-400">{entry.dateKey}</span></p>
                    <p className="mt-0.5 text-[0.72rem] text-slate-400 line-clamp-1">{entry.reason}</p>
                  </div>
                  <StatusBadge status={entry.status} />
                  {canDelete && (
                    <form action={deleteAction}>
                      <input type="hidden" name="requestId" value={entry.id} />
                      <button
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[0.7rem] font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
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

const INPUT = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {hint && <span className="mb-1.5 block text-[0.7rem] text-slate-400">{hint}</span>}
      {children}
    </label>
  );
}

function FeedbackBanner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const cfg = tone === "error"
    ? { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", text: "#dc2626" }
    : { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", text: "#059669" };
  return (
    <div className="rounded-2xl border px-4 py-3 text-sm font-medium" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
      {children}
    </div>
  );
}
