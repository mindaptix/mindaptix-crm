"use client";

import type { ReactNode } from "react";
import React, { startTransition, useActionState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyLeaveRequest, deleteLeaveRequest, reviewLeaveRequest } from "@/features/dashboard/actions/leaves";
import { emitDashboardSync, subscribeDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import { FormActionButton } from "@/shared/ui/form-action-button";
import { DashboardTable, DashboardTableCell } from "@/shared/ui/dashboard-table";
import type { LeavePageData } from "@/features/dashboard/types";
import type { LeaveType } from "@/database/mongodb/models/leave-request";

type LeavesPanelProps = {
  canApply: boolean;
  canReview: boolean;
  data: LeavePageData;
};

const INITIAL_LEAVE_STATE = {
  values: {
    leaveType: "PAID" as LeaveType,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  },
};

export function LeavesPanel({ canApply, canReview, data }: LeavesPanelProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(applyLeaveRequest, INITIAL_LEAVE_STATE);
  const pendingReviewCount = data.leaves.filter((leave) => leave.status === "PENDING").length;
  const showApplyForm = canApply;
  const isLeadershipReviewView = !canApply;
  const isEmployeeHistoryView = canApply && !canReview;
  const displayedLeaves = [...data.leaves];
  const refreshLeavesView = useCallback(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (state.success) {
      emitDashboardSync("leave-applied");
      refreshLeavesView();
    }
  }, [state.success, refreshLeavesView]);

  // Auto-refresh when admin approves/rejects on another tab/device
  useEffect(() => {
    const unsub = subscribeDashboardSync(refreshLeavesView);
    const onVisible = () => { if (document.visibilityState === "visible") refreshLeavesView(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { unsub(); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshLeavesView]);

  return (
    <div className="space-y-6 overflow-x-hidden px-3 py-3 sm:px-7 sm:py-6">
      {!isLeadershipReviewView ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.summaryCards.map((card) => (
            <OverviewCard detail={card.detail} key={card.label} label={card.label} value={card.value} />
          ))}
        </section>
      ) : null}

      <section className="space-y-6">
        {showApplyForm ? (
          <PanelSection
            description="Apply for paid or sick leave with a reason and date range. Admins can review company leave requests from the same page."
            eyebrow="Leave Form"
            title="Apply Leave"
          >
            <form action={formAction} className="mt-6 max-w-[940px] space-y-4">
              {state.error ? <Feedback>{state.error}</Feedback> : null}
              {state.success ? <Feedback tone="success">{state.success}</Feedback> : null}

              <div className="grid gap-4 xl:grid-cols-[minmax(220px,260px)_minmax(180px,220px)_minmax(180px,220px)]">
                <SelectField
                  defaultValue={state.values?.leaveType ?? "PAID"}
                  label="Leave Type"
                  labels={{ PAID: "Paid Leave", SICK: "Sick Leave" }}
                  name="leaveType"
                  options={["PAID", "SICK"]}
                />
                <Field defaultValue={state.values?.startDate} label="Start Date" name="startDate" placeholder="Start date" type="date" />
                <Field defaultValue={state.values?.endDate} label="End Date" name="endDate" placeholder="End date" type="date" />
              </div>

              <TextAreaField
                defaultValue={state.values?.reason}
                label="Reason"
                name="reason"
                placeholder="Write a short reason for the leave request"
              />

              <Button className="sm:w-auto" disabled={pending} type="submit">
                {pending ? "Submitting..." : "Apply Leave"}
              </Button>
            </form>
          </PanelSection>
        ) : null}

        {isEmployeeHistoryView ? (
          <section className="min-w-0 rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.06)] sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Leave History</p>
                <h2 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-slate-950">My Requests</h2>
              </div>
              <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {displayedLeaves.length} total request{displayedLeaves.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-5 max-w-full">
              <EmployeeLeaveHistoryTable leaves={displayedLeaves} />
            </div>
          </section>
        ) : (
          <PanelSection
            description={
              isLeadershipReviewView
                ? "Approve or reject employee leave requests from one place."
                : canReview
                  ? "Review employee leave requests, track used leave days, and approve or reject pending requests from one place."
                  : !canApply
                    ? "Read-only company leave history showing requested dates, current status, and employee leave usage."
                    : "Complete leave history for your account, including pending, approved, and rejected requests."
            }
            eyebrow="Leave History"
            title={isLeadershipReviewView ? "Employee Leave Requests" : canReview ? "Review Requests" : canApply ? "Requests" : "Leave History"}
          >
            <div className="mt-6 max-w-full">
            {canReview && !isLeadershipReviewView ? (
              <div className="mb-6 max-w-full overflow-hidden rounded-[1.75rem] border border-amber-200/80 bg-[linear-gradient(135deg,#fff7db_0%,#fffdf3_58%,#ffffff_100%)] shadow-[0_20px_45px_rgba(245,158,11,0.14)]">
                <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:items-center">
                  <div>
                    <div className="inline-flex items-center rounded-full border border-amber-300/70 bg-white/70 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-amber-700">
                      Review Queue
                    </div>
                    <p className="mt-3 text-xl font-semibold text-slate-950">{pendingReviewCount} pending request(s) need review.</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                      Approve or reject requests below, and use the employee summary to track how many leave days each employee has used.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-2">
                    <MetricBadge tone="warning" label="Pending" value={String(pendingReviewCount)} />
                    <MetricBadge tone="success" label="Approved" value={data.summaryCards[1]?.value ?? "0"} />
                    <MetricBadge tone="danger" label="Rejected" value={data.summaryCards[2]?.value ?? "0"} />
                    <MetricBadge tone="neutral" label="History" value={data.summaryCards[3]?.value ?? "0"} />
                  </div>
                </div>
              </div>
            ) : null}

            {canReview && data.employeeSummaries.length && !isLeadershipReviewView ? (
              <div className="mb-6 max-w-full">
                <div className="mb-4 flex flex-col gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">Employee Leave Summary</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Quick view of requested and approved leave totals for each employee.</p>
                  </div>
                  <div className="inline-flex w-fit items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    Usage Snapshot
                  </div>
                </div>

                <div className="max-w-full overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                  <DashboardTable
                    columns={[
                      { label: "Employee" },
                      { label: "Approved" },
                      { label: "Pending" },
                      { label: "Rejected" },
                      { label: "Days Used" },
                      { label: "Days Requested" },
                    ]}
                    emptyMessage="No employee leave summary available yet."
                    hasRows={data.employeeSummaries.length > 0}
                    hideScrollbar
                  >
                    {data.employeeSummaries.map((summary) => (
                      <tr className="bg-white/80 transition hover:bg-sky-50/55" key={summary.id}>
                        <DashboardTableCell className="min-w-[190px]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#0f172a_100%)] text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]">
                              {getInitials(summary.employeeName)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{summary.employeeName}</p>
                              <p className="mt-1 text-xs text-slate-500">{summary.employeeEmail}</p>
                            </div>
                          </div>
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <CountPill tone="success" value={summary.approvedRequests} />
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <CountPill tone="warning" value={summary.pendingRequests} />
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <CountPill tone="danger" value={summary.rejectedRequests} />
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <ValueBlock label="approved days" tone="success" value={summary.approvedDays} />
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <ValueBlock label="total asked" tone="primary" value={summary.requestedDays} />
                        </DashboardTableCell>
                      </tr>
                    ))}
                  </DashboardTable>
                </div>
              </div>
            ) : null}

            {isLeadershipReviewView ? (
              <LeadershipLeaveReviewTable canReview={canReview} leaves={displayedLeaves} />
            ) : (
              <div className={`grid gap-4 ${canReview ? "xl:grid-cols-2" : "grid-cols-1"}`}>
                {displayedLeaves.length ? (
                  displayedLeaves.map((leave) => (
                    <LeaveRequestCard canDelete={canApply || canReview} canReview={canReview} key={leave.id} leave={leave} />
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                    No leave requests available yet.
                  </div>
                )}
              </div>
            )}
            </div>
          </PanelSection>
        )}
      </section>
    </div>
  );
}

function getStatusBadgeClassName(status: string) {
  switch (status) {
    case "APPROVED":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getLeaveTypeBadgeClassName(type: string) {
  switch (type) {
    case "SICK":
      return "border border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border border-sky-200 bg-sky-50 text-sky-700";
  }
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function CountPill({ tone, value }: { tone: "success" | "warning" | "danger"; value: number }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return <span className={`inline-flex min-w-[56px] items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold ${className}`}>{value}</span>;
}

function ValueBlock({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "primary" | "success";
  value: number;
}) {
  const className =
    tone === "success"
      ? "border-emerald-200/80 bg-[linear-gradient(180deg,#ecfdf5_0%,#f7fee7_100%)] text-emerald-700"
      : "border-sky-200/80 bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_100%)] text-sky-700";

  return (
    <div className={`inline-flex min-w-[88px] flex-col rounded-2xl border px-3 py-2 ${className}`}>
      <span className="text-lg font-semibold leading-none">{value}</span>
      <span className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</span>
    </div>
  );
}

function MetricBadge({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "warning" | "success" | "danger" | "neutral";
  value: string;
}) {
  const className =
    tone === "warning"
      ? "border-amber-200/80 bg-white/80 text-amber-700"
      : tone === "success"
        ? "border-emerald-200/80 bg-white/80 text-emerald-700"
        : tone === "danger"
          ? "border-rose-200/80 bg-white/80 text-rose-700"
          : "border-slate-200/80 bg-white/80 text-slate-700";

  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-[0_10px_22px_rgba(255,255,255,0.32)] ${className}`}>
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function EmployeeLeaveHistoryTable({ leaves }: { leaves: LeavePageData["leaves"] }) {
  return (
    <div className="max-w-full overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <DashboardTable
        columns={[
          { label: "Type", className: "w-[110px]" },
          { label: "Dates", className: "w-[180px]" },
          { label: "Days", className: "w-[84px]" },
          { label: "Reason" },
          { label: "Status", className: "w-[132px]" },
          { label: "Action", className: "w-[104px]" },
        ]}
        emptyMessage="No leave requests available yet."
        fixedLayout
        hasRows={leaves.length > 0}
        hideScrollbar
      >
        {leaves.map((leave) => (
          <tr className="bg-white/80 transition hover:bg-sky-50/50" key={leave.id}>
            <DashboardTableCell className="whitespace-nowrap">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getLeaveTypeBadgeClassName(leave.leaveType)}`}>
                {formatLabel(leave.leaveType)}
              </span>
            </DashboardTableCell>
            <DashboardTableCell>
              <div className="space-y-1 text-sm font-semibold text-slate-900">
                <div>{leave.startDate}</div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">to</div>
                <div>{leave.endDate}</div>
              </div>
            </DashboardTableCell>
            <DashboardTableCell className="whitespace-nowrap">
              <span className="inline-flex min-w-[58px] items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                {leave.requestedDays}
              </span>
            </DashboardTableCell>
            <DashboardTableCell>
              <p className="whitespace-normal break-words text-sm leading-6 text-slate-700">{leave.reason}</p>
            </DashboardTableCell>
            <DashboardTableCell className="whitespace-nowrap">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(leave.status)}`}>
                {formatLabel(leave.status)}
              </span>
            </DashboardTableCell>
            <DashboardTableCell className="whitespace-nowrap">
              <form action={deleteLeaveRequest}>
                <input name="leaveId" type="hidden" value={leave.id} />
                <FormActionButton
                  className="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
                  pendingLabel="Deleting..."
                  type="submit"
                >
                  Delete
                </FormActionButton>
              </form>
            </DashboardTableCell>
          </tr>
        ))}
      </DashboardTable>
    </div>
  );
}

function LeadershipLeaveReviewTable({
  canReview,
  leaves,
}: {
  canReview: boolean;
  leaves: LeavePageData["leaves"];
}) {
  return (
    <div className="max-w-full overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <DashboardTable
        columns={[
          { label: "Employee", className: "w-[220px]" },
          { label: "Leave", className: "w-[112px]" },
          { label: "Dates", className: "w-[190px]" },
          { label: "Days", className: "w-[84px]" },
          { label: "Reason" },
          { label: "Status", className: "w-[132px]" },
          { label: "Action", className: "w-[260px]" },
        ]}
        emptyMessage="No leave requests available yet."
        fixedLayout
        hasRows={leaves.length > 0}
        hideScrollbar
      >
        {leaves.map((leave) => (
          <tr className="bg-white/80 transition hover:bg-sky-50/45" key={leave.id}>
            <DashboardTableCell>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{leave.employeeName}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{leave.employeeEmail}</p>
              </div>
            </DashboardTableCell>
            <DashboardTableCell className="whitespace-nowrap">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getLeaveTypeBadgeClassName(leave.leaveType)}`}>
                {formatLabel(leave.leaveType)}
              </span>
            </DashboardTableCell>
            <DashboardTableCell>
              <div className="space-y-1 text-sm font-semibold text-slate-900">
                <div>{leave.startDate}</div>
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">to</div>
                <div>{leave.endDate}</div>
              </div>
            </DashboardTableCell>
            <DashboardTableCell className="whitespace-nowrap">
              <span className="inline-flex min-w-[58px] items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                {leave.requestedDays}
              </span>
            </DashboardTableCell>
            <DashboardTableCell>
              <p className="line-clamp-3 whitespace-normal break-words text-sm leading-6 text-slate-700">{leave.reason}</p>
            </DashboardTableCell>
            <DashboardTableCell className="whitespace-nowrap">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(leave.status)}`}>
                {formatLabel(leave.status)}
              </span>
            </DashboardTableCell>
            <DashboardTableCell>
              <div className="flex flex-wrap gap-2">
                {canReview && leave.status === "PENDING" ? (
                  <>
                    <form action={reviewLeaveRequest} onSubmit={() => emitDashboardSync("leave-reviewed")}>
                      <input name="leaveId" type="hidden" value={leave.id} />
                      <input name="status" type="hidden" value="APPROVED" />
                      <FormActionButton className="min-w-[94px] rounded-xl px-3 py-2 text-sm shadow-[0_12px_28px_rgba(22,163,74,0.22)]" pendingLabel="Saving..." type="submit">
                        Approve
                      </FormActionButton>
                    </form>
                    <form action={reviewLeaveRequest} onSubmit={() => emitDashboardSync("leave-reviewed")}>
                      <input name="leaveId" type="hidden" value={leave.id} />
                      <input name="status" type="hidden" value="REJECTED" />
                      <FormActionButton
                        className="min-w-[94px] rounded-xl border border-rose-300 bg-[linear-gradient(135deg,#fff1f2_0%,#fda4af_100%)] px-3 py-2 text-sm font-semibold text-rose-800 shadow-[0_10px_24px_rgba(244,63,94,0.16)] hover:border-rose-400 hover:bg-[linear-gradient(135deg,#ffe4e6_0%,#fb7185_100%)] hover:text-rose-950"
                        pendingLabel="Rejecting..."
                        type="submit"
                      >
                        Reject
                      </FormActionButton>
                    </form>
                  </>
                ) : (
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Processed
                  </div>
                )}
              </div>
            </DashboardTableCell>
          </tr>
        ))}
      </DashboardTable>
    </div>
  );
}

function LeaveRequestCard({
  canDelete,
  canReview,
  leave,
}: {
  canDelete: boolean;
  canReview: boolean;
  leave: LeavePageData["leaves"][number];
}) {
  return (
    <article className="rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_100%)] text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]">
            {getInitials(leave.employeeName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{leave.employeeName}</p>
            <p className="truncate text-sm text-slate-500">{leave.employeeEmail}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getLeaveTypeBadgeClassName(leave.leaveType)}`}>
            {formatLabel(leave.leaveType)}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(leave.status)}`}>
            {leave.status}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_160px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Leave Dates</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            <span>{leave.startDate}</span>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">to</span>
            <span>{leave.endDate}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_100%)] px-4 py-3 text-sky-700">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] opacity-80">Duration</p>
          <p className="mt-2 text-3xl font-semibold leading-none">{leave.requestedDays}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
            {leave.requestedDays === 1 ? "day" : "days"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Action</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{leave.status === "PENDING" ? "Needs review" : "Processed"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Reason</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{leave.reason}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canReview && leave.status === "PENDING" ? (
          <>
            <form action={reviewLeaveRequest} onSubmit={() => emitDashboardSync("leave-reviewed")}>
              <input name="leaveId" type="hidden" value={leave.id} />
              <input name="status" type="hidden" value="APPROVED" />
              <FormActionButton className="min-w-[120px] rounded-xl px-4 py-2.5 text-sm shadow-[0_16px_32px_rgba(22,163,74,0.28)] sm:w-auto" pendingLabel="Saving..." type="submit">
                Approve
              </FormActionButton>
            </form>
            <form action={reviewLeaveRequest} onSubmit={() => emitDashboardSync("leave-reviewed")}>
              <input name="leaveId" type="hidden" value={leave.id} />
              <input name="status" type="hidden" value="REJECTED" />
              <FormActionButton
                className="min-w-[120px] rounded-xl border border-rose-300 bg-[linear-gradient(135deg,#fff1f2_0%,#fda4af_100%)] px-4 py-2.5 text-sm font-semibold text-rose-800 shadow-[0_14px_30px_rgba(244,63,94,0.18)] hover:border-rose-400 hover:bg-[linear-gradient(135deg,#ffe4e6_0%,#fb7185_100%)] hover:text-rose-950 sm:w-auto"
                pendingLabel="Rejecting..."
                type="submit"
              >
                Reject
              </FormActionButton>
            </form>
          </>
        ) : (
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {leave.status === "PENDING" ? "Waiting for review" : "Processed"}
          </div>
        )}
        {canDelete ? (
          <form action={deleteLeaveRequest}>
            <input name="leaveId" type="hidden" value={leave.id} />
            <FormActionButton
              className="min-w-[120px] rounded-xl border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              pendingLabel="Deleting..."
              type="submit"
            >
              Delete
            </FormActionButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}

const OVERVIEW_CARD_CONFIG: Record<string, {
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
}> = {
  PENDING: {
    gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)",
    shadow: "0 8px 24px rgba(245,158,11,0.3)",
    icon: (
      <svg fill="none" height="22" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="22">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  APPROVED: {
    gradient: "linear-gradient(135deg,#10b981,#34d399)",
    shadow: "0 8px 24px rgba(16,185,129,0.3)",
    icon: (
      <svg fill="none" height="22" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="22">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  REJECTED: {
    gradient: "linear-gradient(135deg,#ef4444,#f87171)",
    shadow: "0 8px 24px rgba(239,68,68,0.3)",
    icon: (
      <svg fill="none" height="22" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="22">
        <circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" />
      </svg>
    ),
  },
  HISTORY: {
    gradient: "linear-gradient(135deg,#6366f1,#818cf8)",
    shadow: "0 8px 24px rgba(99,102,241,0.3)",
    icon: (
      <svg fill="none" height="22" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="22">
        <rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
};

function OverviewCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  const config = OVERVIEW_CARD_CONFIG[label.toUpperCase()] ?? OVERVIEW_CARD_CONFIG.HISTORY;
  return (
    <article className="relative overflow-hidden rounded-[1.7rem] p-5 text-white shadow-lg"
      style={{ background: config.gradient, boxShadow: config.shadow }}>
      {/* decorative circle */}
      <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-black/10" />

      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-white/80">{label}</p>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          {config.icon}
        </div>
      </div>
      <p className="mt-3 text-4xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[0.75rem] font-medium leading-5 text-white/70">{detail}</p>
    </article>
  );
}

function PanelSection({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-4xl shadow-[0_8px_40px_rgba(15,23,42,0.1)]"
      style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff" }}>
      {/* Gradient header band */}
      <div className="px-6 py-5"
        style={{
          background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)",
          borderBottom: "1px solid rgba(99,102,241,0.1)",
        }}>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]"
          style={{ color: "#6366f1" }}>{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">{title}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

type FieldProps = {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
};

function Field({ defaultValue, label, name, placeholder, type = "text" }: FieldProps) {
  const icon =
    type === "date" ? (
      <svg className="shrink-0 text-indigo-400" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ) : null;

  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>
        {label}
      </label>
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        {icon && <span className="pointer-events-none absolute left-3.5">{icon}</span>}
        <input
          className={`min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${icon ? "pl-9 pr-4" : "px-4"} ${type === "date" ? "scheme-light" : ""}`}
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </div>
    </div>
  );
}

function TextAreaField({ defaultValue, label, name, placeholder }: Omit<FieldProps, "type">) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>
        {label}
      </label>
      <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        <span className="pointer-events-none absolute left-3.5 top-3.5">
          <svg className="text-indigo-400" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
        <textarea
          className="min-h-28 w-full bg-transparent py-3 pl-9 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  );
}

function SelectField({
  defaultValue,
  label,
  labels,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  labels?: Record<string, string>;
  name: string;
  options: string[];
}) {
  const leaveIcon = (
    <svg className="shrink-0 text-indigo-400" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <rect height="20" rx="2" ry="2" width="14" x="5" y="2" /><line x1="9" x2="15" y1="7" y2="7" /><line x1="9" x2="15" y1="11" y2="11" /><line x1="9" x2="11" y1="15" y2="15" />
    </svg>
  );
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>
        {label}
      </label>
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        <span className="pointer-events-none absolute left-3.5">{leaveIcon}</span>
        <select
          className="w-full appearance-none bg-transparent py-3 pl-9 pr-8 text-sm text-slate-800 outline-none"
          defaultValue={defaultValue}
          id={name}
          name={name}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels?.[option] ?? option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3.5">
          <svg className="text-slate-400" fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  );
}




