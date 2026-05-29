"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";
import { createSalesLead, updateSalesLeadCall, type SalesLeadFormState, type UpdateCallFormState } from "@/features/dashboard/actions/sales-leads";
import { emitDashboardSync } from "@/features/dashboard/lib/live-sync";
import type { EmployeeOption, SalesLeadEntry, SalesWorkspaceData } from "@/features/dashboard/types";
import { Feedback } from "@/shared/ui/feedback";
import { DashboardTable, DashboardTableCell } from "@/shared/ui/dashboard-table";

// ── Constants ──────────────────────────────────────────────────────────────────

const CALL_STATUS_LABELS: Record<string, string> = {
  NO_ANSWER: "No Answer",
  CALLBACK: "Callback",
  LOST: "Lost",
  MAYBE_FUTURE: "Maybe Future",
  NOT_INTERESTED: "Not Interested",
};

const CALL_STATUS_OPTIONS = ["NO_ANSWER", "CALLBACK", "LOST", "MAYBE_FUTURE", "NOT_INTERESTED"];

const CALL_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  NO_ANSWER:     { bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-300",  dot: "bg-slate-400"   },
  CALLBACK:      { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-300",  dot: "bg-amber-500"   },
  LOST:          { bg: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-300",   dot: "bg-rose-500"    },
  MAYBE_FUTURE:  { bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-300", dot: "bg-violet-500"  },
  NOT_INTERESTED:{ bg: "bg-red-100",     text: "text-red-700",     border: "border-red-300",    dot: "bg-red-500"     },
};

// Full static Tailwind classes for peer-checked (must be literal for JIT scanner)
const CALL_STATUS_PICKER_CLASSES: Record<string, string> = {
  NO_ANSWER:      "peer-checked:bg-slate-100 peer-checked:text-slate-600 peer-checked:border-slate-300",
  CALLBACK:       "peer-checked:bg-amber-100 peer-checked:text-amber-700 peer-checked:border-amber-300",
  LOST:           "peer-checked:bg-rose-100 peer-checked:text-rose-700 peer-checked:border-rose-300",
  MAYBE_FUTURE:   "peer-checked:bg-violet-100 peer-checked:text-violet-700 peer-checked:border-violet-300",
  NOT_INTERESTED: "peer-checked:bg-red-100 peer-checked:text-red-700 peer-checked:border-red-300",
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  HOT:  { bg: "bg-rose-50",   text: "text-rose-600",   dot: "bg-rose-500"   },
  WARM: { bg: "bg-amber-50",  text: "text-amber-600",  dot: "bg-amber-500"  },
  COLD: { bg: "bg-blue-50",   text: "text-blue-600",   dot: "bg-blue-400"   },
};

// ── Types ──────────────────────────────────────────────────────────────────────

type SalesWorkspacePanelProps = {
  canManageWorkspace: boolean;
  salesLeadPriorityOptions: string[];
  salesLeadRows: SalesLeadEntry[];
  salesLeadSourceOptions: string[];
  salesLeadStatusOptions: string[];
  salesOnly?: boolean;
  salesOptions: EmployeeOption[];
  salesTechnologyOptions: string[];
  salesWorkspace: SalesWorkspaceData;
};

const INITIAL_SALES_LEAD_STATE: SalesLeadFormState = {};
const INITIAL_UPDATE_CALL_STATE: UpdateCallFormState = {};

// ── Main Component ─────────────────────────────────────────────────────────────

export function SalesWorkspacePanel({
  canManageWorkspace,
  salesLeadPriorityOptions,
  salesLeadRows,
  salesLeadSourceOptions,
  salesLeadStatusOptions,
  salesOnly = false,
  salesOptions,
  salesTechnologyOptions,
  salesWorkspace,
}: SalesWorkspacePanelProps) {
  const [salesLeadState, createSalesLeadAction, salesLeadPending] = useActionState(createSalesLead, INITIAL_SALES_LEAD_STATE);
  const salesLabelById = Object.fromEntries(salesOptions.map((u) => [u.id, u.label]));

  const totalTrackedBudget   = salesLeadRows.reduce((s, r) => s + r.budget, 0);

  const todayMeetingCount    = salesLeadRows.filter((r) => r.meetingDate === getTodayDate()).length;
  const callbackDueCount     = salesLeadRows.filter((r) => r.callStatus === "CALLBACK").length;
  const overdueFollowUps     = salesWorkspace.followUps.filter((r) => r.status === "PENDING" && r.followUpDate && r.followUpDate < getTodayDate()).length;
  const openDealCount        = salesWorkspace.deals.filter((r) => r.status === "OPEN").length;
  const pendingCollectionVal = salesWorkspace.payments
    .filter((r) => r.status === "PENDING" || r.status === "PARTIAL" || r.status === "OVERDUE")
    .reduce((s, r) => s + Math.max(r.amount - r.receivedAmount, 0), 0);

  useEffect(() => {
    if (salesLeadState.success) emitDashboardSync("sales-lead-created");
  }, [salesLeadState.success]);

  const statsCards = salesOnly
    ? [
        { label: "My Leads",        value: String(salesLeadRows.length),   sub: "Total logged",          color: "blue"   },
        { label: "Callback Due",    value: String(callbackDueCount),        sub: "Need follow-up",        color: "amber"  },
        { label: "Meetings Today",  value: String(todayMeetingCount),       sub: "Scheduled today",       color: "violet" },
        { label: "Overdue",         value: String(overdueFollowUps),        sub: "Past follow-up date",   color: "rose"   },
      ]
    : [
        { label: "Total Leads",     value: String(salesLeadRows.length),    sub: "Across all reps",       color: "blue"   },
        { label: "Open Deals",      value: String(openDealCount),           sub: "Active pipeline",       color: "violet" },
        { label: "Client Budget",   value: formatCurrency(totalTrackedBudget), sub: "Captured interest",  color: "emerald"},
        { label: "Pending Collect", value: formatCurrency(pendingCollectionVal), sub: "Outstanding",      color: "rose"   },
      ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-7 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
                {salesOnly ? "My Pipeline" : "Sales Pipeline"}
              </p>
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              {salesOnly ? "My Sales Workspace" : "Sales Workspace"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {salesOnly
                ? "Apne leads track karo, call status update karo aur follow-ups manage karo."
                : "Full sales pipeline — lead intake, follow-ups, deals, payments aur target tracking."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">Live Sync</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statsCards.map((card) => {
            const colorMap: Record<string, string> = {
              blue:    "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-300",
              amber:   "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-300",
              violet:  "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-300",
              rose:    "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-300",
              emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-300",
            };
            return (
              <div className={`rounded-2xl border bg-gradient-to-br px-4 py-4 ${colorMap[card.color]}`} key={card.label}>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="mt-1 text-xs font-semibold">{card.label}</p>
                <p className="mt-0.5 text-[0.68rem] text-slate-400">{card.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SALES EMPLOYEE FORM ──────────────────────────────────────── */}
      {salesOnly ? <SalesLeadForm
        leadState={salesLeadState}
        pending={salesLeadPending}
        priorityOptions={salesLeadPriorityOptions}
        sourceOptions={salesLeadSourceOptions}
        submitAction={createSalesLeadAction}
        techOptions={salesTechnologyOptions}
      /> : null}

      {/* ── ADMIN FORM ───────────────────────────────────────────────── */}
      {canManageWorkspace ? <AdminLeadForm
        leadState={salesLeadState}
        pending={salesLeadPending}
        priorityOptions={salesLeadPriorityOptions}
        salesLabelById={salesLabelById}
        salesOptions={salesOptions}
        sourceOptions={salesLeadSourceOptions}
        statusOptions={salesLeadStatusOptions}
        submitAction={createSalesLeadAction}
        techOptions={salesTechnologyOptions}
      /> : null}

      {/* ── LEADS LIST ───────────────────────────────────────────────── */}
      <LeadsSection rows={salesLeadRows} salesOnly={salesOnly} />

      {/* ── PIPELINE TABLES (admin) ───────────────────────────────────── */}
      {!salesOnly ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <PipelineCard
              columns={["Client", "Follow-up", "Status"]}
              description="Aaj aur upcoming call commitments."
              empty="No follow-up queue available yet."
              eyebrow="Follow-up Queue"
              hasRows={salesWorkspace.followUps.length > 0}
              title="Follow-ups"
            >
              {salesWorkspace.followUps.map((row) => (
                <tr key={row.id}>
                  <DashboardTableCell>
                    <p className="font-semibold text-slate-900">{row.clientName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.salesUserName}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-medium text-slate-900">{row.followUpDate}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.followUpTime || "Time TBD"} · {row.channel}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <StatusBadge label={row.status} tone={row.status === "COMPLETED" ? "emerald" : row.status === "MISSED" ? "rose" : "amber"} />
                    <p className="mt-2 text-xs leading-5 text-slate-500">{row.outcome || "Outcome pending"}</p>
                  </DashboardTableCell>
                </tr>
              ))}
            </PipelineCard>

            <PipelineCard
              columns={["Deal", "Stage", "Value"]}
              description="Proposal se closure tak commercial opportunities."
              empty="No deal records available yet."
              eyebrow="Deal Tracker"
              hasRows={salesWorkspace.deals.length > 0}
              title="Deals"
            >
              {salesWorkspace.deals.map((row) => (
                <tr key={row.id}>
                  <DashboardTableCell>
                    <p className="font-semibold text-slate-900">{row.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.salesUserName}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <StatusBadge label={row.stage.replaceAll("_", " ")} tone={row.status === "WON" ? "emerald" : row.status === "LOST" ? "rose" : "blue"} />
                    <p className="mt-1 text-xs text-slate-500">{row.status.replaceAll("_", " ")}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-bold text-slate-900">{formatCurrency(row.amount)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.probability}% probability</p>
                    <p className="mt-1 text-xs text-slate-400">Close {row.expectedCloseDate || "TBD"}</p>
                  </DashboardTableCell>
                </tr>
              ))}
            </PipelineCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PipelineCard
              columns={["Invoice", "Due Date", "Collection"]}
              description="Pending aur overdue payment visibility."
              empty="No payment records available yet."
              eyebrow="Collections"
              hasRows={salesWorkspace.payments.length > 0}
              title="Payments"
            >
              {salesWorkspace.payments.map((row) => (
                <tr key={row.id}>
                  <DashboardTableCell>
                    <p className="font-semibold text-slate-900">{row.invoiceNumber || "Invoice pending"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.salesUserName}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-medium text-slate-900">{row.dueDate || "No due date"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Received {row.receivedDate || "not yet"}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-bold text-slate-900">{formatCurrency(row.amount)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Rcvd {formatCurrency(row.receivedAmount)}</p>
                    <div className="mt-2">
                      <StatusBadge label={row.status} tone={row.status === "PAID" ? "emerald" : row.status === "OVERDUE" ? "rose" : "amber"} />
                    </div>
                  </DashboardTableCell>
                </tr>
              ))}
            </PipelineCard>

            <PipelineCard
              columns={["Sales Rep", "Month", "Progress"]}
              description="Monthly target aur achievement snapshot."
              empty="No sales targets created yet."
              eyebrow="Targets"
              hasRows={salesWorkspace.targets.length > 0}
              title="Target Tracker"
            >
              {salesWorkspace.targets.map((row) => (
                <tr key={row.id}>
                  <DashboardTableCell>
                    <p className="font-semibold text-slate-900">{row.salesUserName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Incentive {formatCurrency(row.incentiveAmount)}</p>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-medium text-slate-900">{row.monthKey}</p>
                    <div className="mt-1">
                      <StatusBadge label={row.status} tone={row.status === "ACHIEVED" ? "emerald" : row.status === "MISSED" ? "rose" : "blue"} />
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <p className="font-bold text-slate-900">{row.achievementRate}%</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatCurrency(row.achievedAmount)} / {formatCurrency(row.targetAmount)}</p>
                  </DashboardTableCell>
                </tr>
              ))}
            </PipelineCard>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Leads Section ──────────────────────────────────────────────────────────────

function LeadsSection({ rows, salesOnly }: { rows: SalesLeadEntry[]; salesOnly: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/60 text-slate-400">
          <svg fill="none" height="24" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600">No leads logged yet</p>
        <p className="mt-1 text-xs text-slate-400">{salesOnly ? "Use the form above to log your first call." : "Add a sales record using the form above."}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-900">
            {salesOnly ? "My Leads" : "All Leads"}
          </h3>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{rows.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <LeadCard key={row.id} row={row} salesOnly={salesOnly} />
        ))}
      </div>
    </div>
  );
}

// ── Lead Card ──────────────────────────────────────────────────────────────────

function LeadCard({ row, salesOnly }: { row: SalesLeadEntry; salesOnly: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cs = CALL_STATUS_COLORS[row.callStatus] ?? { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-300" };
  const pr = PRIORITY_COLORS[row.priority]   ?? { bg: "bg-slate-50",  text: "text-slate-500", dot: "bg-slate-300"  };

  const borderAccent =
    row.callStatus === "CALLBACK"       ? "border-l-amber-400"  :
    row.callStatus === "LOST"           ? "border-l-rose-400"   :
    row.callStatus === "NOT_INTERESTED" ? "border-l-red-500"    :
    row.callStatus === "MAYBE_FUTURE"   ? "border-l-violet-400" :
    row.callStatus === "NO_ANSWER"      ? "border-l-slate-400"  :
                                          "border-l-blue-300";

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-4 border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${borderAccent}`}>
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 text-sm font-bold text-slate-700">
            {(row.companyName || row.clientName).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 leading-tight">{row.companyName || row.clientName}</p>
            {row.companyName ? (
              <p className="text-sm text-slate-500">{row.clientName}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {row.clientPhone ? <span>{row.clientPhone}</span> : null}
              {row.clientPhone && row.clientEmail ? <span>·</span> : null}
              {row.clientEmail ? <span>{row.clientEmail}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority */}
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${pr.bg} ${pr.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
            {row.priority}
          </span>

          {/* Call Status */}
          {row.callStatus ? (
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] font-bold ${cs.bg} ${cs.text} ${cs.border}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cs.dot}`} />
              {CALL_STATUS_LABELS[row.callStatus] ?? row.callStatus}
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.68rem] font-semibold text-slate-400">
              No call logged
            </span>
          )}

          {/* Source */}
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[0.68rem] font-semibold text-blue-600">
            {row.source}
          </span>
        </div>
      </div>

      {/* Call dates strip */}
      <div className="mx-4 mb-3 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50">
        <div className="px-3 py-2.5">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">First Call</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">{row.dateOfFirstCall || "—"}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Last Call</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">{row.dateOfLastCall || "—"}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-blue-500">Next Call</p>
          <p className={`mt-0.5 text-xs font-bold ${row.nextFollowUpDate ? "text-blue-700" : "text-slate-400"}`}>
            {row.nextFollowUpDate || "—"}
          </p>
        </div>
      </div>

      {/* Callback reminder */}
      {row.callbackReminderDate ? (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <svg className="shrink-0 text-amber-500" fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="text-xs font-semibold text-amber-700">Callback Reminder: {row.callbackReminderDate}</p>
        </div>
      ) : null}

      {/* Call notes */}
      {(row.callNotes || row.notes) ? (
        <div className="mx-4 mb-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Call Notes</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{row.callNotes || row.notes}</p>
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {!salesOnly ? (
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.68rem] font-semibold text-slate-600">
              {row.salesUserName}
            </span>
          ) : null}
          {row.technologies.slice(0, 3).map((tech) => (
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.68rem] text-slate-500" key={tech}>{tech}</span>
          ))}
          {row.technologies.length > 3 ? (
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.68rem] text-slate-400">+{row.technologies.length - 3}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.68rem] text-slate-400">Added {row.createdAt}</span>
          {salesOnly ? (
            <button
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              onClick={() => setExpanded((v) => !v)}
              type="button"
            >
              {expanded ? "Cancel" : "+ Log Call Update"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Inline call update form */}
      {salesOnly && expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 pb-5 pt-4">
          <UpdateCallForm leadId={row.id} onSuccess={() => setExpanded(false)} />
        </div>
      ) : null}
    </div>
  );
}

// ── Inline Update Form ─────────────────────────────────────────────────────────

function UpdateCallForm({ leadId, onSuccess }: { leadId: string; onSuccess: () => void }) {
  const [state, action, pending] = useActionState(updateSalesLeadCall, INITIAL_UPDATE_CALL_STATE);

  useEffect(() => {
    if (state.success) {
      emitDashboardSync("call-log-updated");
      onSuccess();
    }
  }, [state.success, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      <input name="leadId" type="hidden" value={leadId} />

      {state.error ? <Feedback>{state.error}</Feedback> : null}

      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Call Status</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {CALL_STATUS_OPTIONS.map((opt) => (
            <label className="cursor-pointer" key={opt}>
              <input className="peer sr-only" name="callStatus" type="radio" value={opt} />
              <span className={`flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-500 transition-all peer-checked:border-current ${CALL_STATUS_PICKER_CLASSES[opt]}`}>
                <span className={`h-2 w-2 rounded-full ${CALL_STATUS_COLORS[opt]?.dot ?? "bg-slate-300"}`} />
                {CALL_STATUS_LABELS[opt]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <InlineDate label="Date of Last Call" name="dateOfLastCall" />
        <InlineDate label="Date of Next Call" name="nextFollowUpDate" />
        <InlineDate label="Callback Reminder" name="callbackReminderDate" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Call Comments</label>
        <textarea
          className="mt-2 min-h-[4.5rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          name="callNotes"
          placeholder="Is call me kya hua, client ki response, next step..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
              Saving...
            </>
          ) : "Save Update"}
        </button>
      </div>
    </form>
  );
}

// ── Sales Employee Log Form ────────────────────────────────────────────────────

function SalesLeadForm({
  leadState, pending, priorityOptions, sourceOptions, submitAction, techOptions,
}: {
  leadState: SalesLeadFormState;
  pending: boolean;
  priorityOptions: string[];
  sourceOptions: string[];
  submitAction: (payload: FormData) => void;
  techOptions: string[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Form header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">My Call Log</p>
            <h3 className="text-lg font-bold text-slate-900">Log New Lead</h3>
          </div>
        </div>
      </div>

      <form action={submitAction} className="px-6 py-5 space-y-5">
        {leadState.error ? <Feedback>{leadState.error}</Feedback> : null}
        {leadState.success ? <Feedback tone="success">{leadState.success}</Feedback> : null}

        {/* Client Info */}
        <FormSection label="Client Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField defaultValue={leadState.values?.companyName} label="Company Name" name="companyName" placeholder="Enter company name" required={false} />
            <FormField defaultValue={leadState.values?.clientName} label="Client Name" name="clientName" placeholder="Enter client name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField defaultValue={leadState.values?.clientPhone} label="Mobile Number" name="clientPhone" placeholder="+91 99999 00000" required={false} />
            <FormField autoComplete="off" defaultValue={leadState.values?.clientEmail} label="Email" name="clientEmail" placeholder="client@example.com" required={false} type="email" />
          </div>
        </FormSection>

        {/* Call Status */}
        <FormSection label="Call Status">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {CALL_STATUS_OPTIONS.map((opt) => (
              <label className="cursor-pointer" key={opt}>
                <input className="peer sr-only" defaultChecked={leadState.values?.callStatus === opt} name="callStatus" type="radio" value={opt} />
                <span className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-transparent bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-500 transition-all hover:border-slate-200 peer-checked:border-current ${CALL_STATUS_PICKER_CLASSES[opt]}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  {CALL_STATUS_LABELS[opt]}
                </span>
              </label>
            ))}
          </div>
        </FormSection>

        {/* Call Dates */}
        <FormSection label="Call Dates">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField defaultValue={leadState.values?.dateOfFirstCall} fallbackTodayForDate label="Date of First Call" name="dateOfFirstCall" placeholder="Select date" required={false} type="date" />
            <FormField defaultValue={leadState.values?.dateOfLastCall} fallbackTodayForDate label="Date of Last Call" name="dateOfLastCall" placeholder="Select date" required={false} type="date" />
            <FormField defaultValue={leadState.values?.nextFollowUpDate} label="Date of Next Call" name="nextFollowUpDate" placeholder="Select date" required={false} type="date" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField defaultValue={leadState.values?.callbackReminderDate} label="Callback Reminder" name="callbackReminderDate" placeholder="Select reminder date" required={false} type="date" />
            <FormSelect defaultValue={leadState.values?.source ?? sourceOptions[0] ?? ""} label="Lead Source" name="source" options={sourceOptions} />
          </div>
        </FormSection>

        {/* Call Comments */}
        <FormSection label="Call Comments">
          <FormTextArea defaultValue={leadState.values?.callNotes} label="" name="callNotes" placeholder="Kya baat hui, client ki response, objections, next action kya hai..." />
        </FormSection>

        {/* Tech & Priority */}
        <FormSection label="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect defaultValue={leadState.values?.priority ?? "WARM"} label="Priority" name="priority" options={priorityOptions} />
            <FormField defaultValue={leadState.values?.budget} label="Client Budget (optional)" name="budget" placeholder="₹ Amount" required={false} type="number" />
          </div>
          <FormMultiSelect defaultValue={leadState.values?.technologies ?? []} helperText="Ctrl/Cmd daba ke multiple select karo." label="Tech Stack / Services Discussed" name="technologies" options={techOptions} />
          <FormTextArea defaultValue={leadState.values?.notes} label="Additional Notes (optional)" name="notes" placeholder="Proposal, pricing, timeline details..." />
        </FormSection>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.28)] transition-all hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 sm:w-auto sm:min-w-48"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Call Record"}
        </button>
      </form>
    </div>
  );
}

// ── Admin Lead Form ────────────────────────────────────────────────────────────

function AdminLeadForm({
  leadState, pending, priorityOptions, salesLabelById, salesOptions, sourceOptions, statusOptions, submitAction, techOptions,
}: {
  leadState: SalesLeadFormState;
  pending: boolean;
  priorityOptions: string[];
  salesLabelById: Record<string, string>;
  salesOptions: EmployeeOption[];
  sourceOptions: string[];
  statusOptions: string[];
  submitAction: (payload: FormData) => void;
  techOptions: string[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm">
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lead Intake</p>
            <h3 className="text-lg font-bold text-slate-900">Add Sales Record</h3>
          </div>
        </div>
      </div>

      <form action={submitAction} className="px-6 py-5 space-y-5">
        {leadState.error ? <Feedback>{leadState.error}</Feedback> : null}
        {leadState.success ? <Feedback tone="success">{leadState.success}</Feedback> : null}

        <FormSection label="Assign To">
          <FormSelect
            defaultValue={leadState.values?.salesUserId ?? ""}
            includePlaceholder
            label="Sales Employee"
            labels={salesLabelById}
            name="salesUserId"
            options={salesOptions.map((u) => u.id)}
            placeholder={salesOptions.length ? "Select sales employee" : "No sales employee available"}
            required
          />
        </FormSection>

        <FormSection label="Client Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField defaultValue={leadState.values?.companyName} label="Company Name" name="companyName" placeholder="Enter company name" required={false} />
            <FormField defaultValue={leadState.values?.clientName} label="Client Name" name="clientName" placeholder="Enter client name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField defaultValue={leadState.values?.clientPhone} label="Mobile Number" name="clientPhone" placeholder="+91 99999 00000" required={false} />
            <FormField autoComplete="off" defaultValue={leadState.values?.clientEmail} label="Email" name="clientEmail" placeholder="client@example.com" required={false} type="email" />
          </div>
        </FormSection>

        <FormSection label="Lead Classification">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormSelect defaultValue={leadState.values?.source ?? sourceOptions[0] ?? ""} label="Source" name="source" options={sourceOptions} />
            <FormSelect defaultValue={leadState.values?.status ?? "NEW"} label="Pipeline Status" name="status" options={statusOptions} />
            <FormSelect defaultValue={leadState.values?.priority ?? "WARM"} label="Priority" name="priority" options={priorityOptions} />
          </div>
        </FormSection>

        <FormSection label="Call Status">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {CALL_STATUS_OPTIONS.map((opt) => (
              <label className="cursor-pointer" key={opt}>
                <input className="peer sr-only" defaultChecked={leadState.values?.callStatus === opt} name="callStatus" type="radio" value={opt} />
                <span className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-transparent bg-slate-50 px-2 py-3 text-xs font-semibold text-slate-500 transition-all hover:border-slate-200 peer-checked:border-current ${CALL_STATUS_PICKER_CLASSES[opt]}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  {CALL_STATUS_LABELS[opt]}
                </span>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection label="Call Dates">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField defaultValue={leadState.values?.dateOfFirstCall} fallbackTodayForDate label="Date of First Call" name="dateOfFirstCall" placeholder="Select date" required={false} type="date" />
            <FormField defaultValue={leadState.values?.dateOfLastCall} fallbackTodayForDate label="Date of Last Call" name="dateOfLastCall" placeholder="Select date" required={false} type="date" />
            <FormField defaultValue={leadState.values?.nextFollowUpDate} label="Date of Next Call" name="nextFollowUpDate" placeholder="Select date" required={false} type="date" />
          </div>
          <FormField defaultValue={leadState.values?.callbackReminderDate} label="Callback Reminder Date" name="callbackReminderDate" placeholder="Select date" required={false} type="date" />
        </FormSection>

        <FormSection label="Call & Sales Notes">
          <FormTextArea defaultValue={leadState.values?.callNotes} label="Call Comments" name="callNotes" placeholder="Kya baat hui, client ki response, objections..." />
          <FormTextArea defaultValue={leadState.values?.notes} label="Sales Notes" name="notes" placeholder="Proposal details, timeline, pricing notes..." />
        </FormSection>

        <FormSection label="Pipeline Details">
          <FormMultiSelect defaultValue={leadState.values?.technologies ?? []} helperText="Ctrl/Cmd daba ke multiple select karo." label="Tech Stack" name="technologies" options={techOptions} />
          <FormField defaultValue={leadState.values?.meetingLink} label="Meeting Link" name="meetingLink" placeholder="https://meet.google.com/..." required={false} />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField defaultValue={leadState.values?.meetingDate} fallbackTodayForDate label="Meeting Date" name="meetingDate" placeholder="Select date" required={false} type="date" />
            <FormField defaultValue={leadState.values?.meetingTime} label="Meeting Time" name="meetingTime" placeholder="10:30 AM" required={false} type="time" />
            <FormField defaultValue={leadState.values?.expectedCloseDate} label="Expected Close" name="expectedCloseDate" placeholder="Select date" required={false} type="date" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField defaultValue={leadState.values?.budget} label="Client Budget" name="budget" placeholder="₹ Amount" required={false} type="number" />
            <FormField defaultValue={leadState.values?.pitchedPrice} label="Pitched Price" name="pitchedPrice" placeholder="₹ Quoted" required={false} type="number" />
          </div>
        </FormSection>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 sm:w-auto sm:min-w-48"
          disabled={pending || salesOptions.length === 0}
          type="submit"
        >
          {pending ? "Saving..." : "Save Sales Record"}
        </button>
      </form>
    </div>
  );
}

// ── Pipeline Card ──────────────────────────────────────────────────────────────

function PipelineCard({
  children, columns, description, empty, eyebrow, hasRows, title,
}: {
  children: ReactNode;
  columns: string[];
  description: string;
  empty: string;
  eyebrow: string;
  hasRows: boolean;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-blue-500">{eyebrow}</p>
        <h3 className="mt-1 text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="p-4">
        <DashboardTable columns={columns.map((label) => ({ label }))} emptyMessage={empty} hasRows={hasRows} hideScrollbar>
          {children}
        </DashboardTable>
      </div>
    </div>
  );
}

// ── Form Primitives ────────────────────────────────────────────────────────────

function FormSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">
        <span className="h-px flex-1 bg-slate-100" />
        {label}
        <span className="h-px flex-1 bg-slate-100" />
      </p>
      {children}
    </div>
  );
}

function FormField({
  autoComplete,
  defaultValue,
  fallbackTodayForDate = false,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  autoComplete?: string;
  defaultValue?: string;
  fallbackTodayForDate?: boolean;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  const resolved = type === "date" && fallbackTodayForDate ? defaultValue || getTodayDate() : defaultValue;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        autoComplete={autoComplete}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${type === "date" ? "scheme-light" : ""}`}
        defaultValue={resolved}
        name={name}
        placeholder={placeholder}
        required={required ?? true}
        type={type}
      />
    </label>
  );
}

function FormSelect({
  defaultValue,
  includePlaceholder = false,
  label,
  labels,
  name,
  options,
  placeholder = "Select option",
  required = false,
}: {
  defaultValue: string;
  includePlaceholder?: boolean;
  label: string;
  labels?: Record<string, string>;
  name: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100" defaultValue={defaultValue} name={name} required={required}>
        {includePlaceholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt} value={opt}>{labels?.[opt] ?? opt}</option>
        ))}
      </select>
    </label>
  );
}

function FormMultiSelect({
  defaultValue,
  helperText,
  label,
  name,
  options,
}: {
  defaultValue: string[];
  helperText?: string;
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <select className="min-h-36 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100" defaultValue={defaultValue} multiple name={name} required>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {helperText ? <span className="mt-1.5 block text-xs text-slate-400">{helperText}</span> : null}
    </label>
  );
}

function FormTextArea({ defaultValue, label, name, placeholder }: { defaultValue?: string; label: string; name: string; placeholder: string }) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span> : null}
      <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100" defaultValue={defaultValue} name={name} placeholder={placeholder} />
    </label>
  );
}

function InlineDate({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.68rem] font-semibold text-slate-500">{label}</span>
      <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none scheme-light focus:border-blue-300 focus:ring-2 focus:ring-blue-100" name={name} type="date" />
    </label>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "amber" | "blue" | "emerald" | "rose" | "slate" | "violet" }) {
  const cls =
    tone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    tone === "rose"    ? "bg-rose-50 text-rose-700 border-rose-200" :
    tone === "amber"   ? "bg-amber-50 text-amber-700 border-amber-200" :
    tone === "violet"  ? "bg-violet-50 text-violet-700 border-violet-200" :
    tone === "slate"   ? "bg-slate-100 text-slate-600 border-slate-200" :
                         "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}
