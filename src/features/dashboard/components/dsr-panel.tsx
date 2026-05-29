"use client";

import React, { type ReactNode, useActionState, useEffect, useState } from "react";
import { submitDailyUpdate } from "@/features/dashboard/actions/dsr";
import { emitDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import type { DsrPageData, EmployeeProjectView } from "@/features/dashboard/types";

type DsrPanelProps = {
  data: DsrPageData;
  simplifiedReview?: boolean;
};

const INITIAL_DSR_STATE = {
  values: {
    workDate: new Date().toISOString().slice(0, 10),
    projectId: "",
  },
};

const STATUS_SC: Record<string, { gradient: string; shadow: string }> = {
  PLANNING:    { gradient: "linear-gradient(135deg,#3b82f6,#6366f1)", shadow: "rgba(99,102,241,0.28)" },
  IN_PROGRESS: { gradient: "linear-gradient(135deg,#10b981,#0d9488)", shadow: "rgba(16,185,129,0.28)" },
  ON_HOLD:     { gradient: "linear-gradient(135deg,#f59e0b,#f97316)", shadow: "rgba(245,158,11,0.28)" },
  COMPLETED:   { gradient: "linear-gradient(135deg,#64748b,#475569)", shadow: "rgba(100,116,139,0.2)" },
};

export function DsrPanel({ data, simplifiedReview = false }: DsrPanelProps) {
  if (data.mode === "employee") return <EmployeeDsrPanel data={data} />;
  return <DsrReviewPanel data={data} simplifiedReview={simplifiedReview} />;
}

/* ══════════════════════════════════════════════
   EMPLOYEE DSR PANEL
══════════════════════════════════════════════ */
function EmployeeDsrPanel({ data }: { data: Extract<DsrPageData, { mode: "employee" }> }) {
  const [state, formAction, pending] = useActionState(submitDailyUpdate, INITIAL_DSR_STATE);
  const todayFiled = data.summaryCards.find((c) => c.label === "DSR Today")?.value !== "Pending";

  useEffect(() => {
    if (state.success) emitDashboardSync("dsr-submitted");
  }, [state.success]);

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          gradient="linear-gradient(135deg,#6366f1,#818cf8)"
          shadow="rgba(99,102,241,0.28)"
          icon={<FolderIcon />}
          label={data.summaryCards[0]?.label ?? "Assigned Projects"}
          value={data.summaryCards[0]?.value ?? "0"}
          detail={data.summaryCards[0]?.detail ?? ""}
        />
        <StatCard
          gradient={todayFiled ? "linear-gradient(135deg,#10b981,#34d399)" : "linear-gradient(135deg,#f59e0b,#fbbf24)"}
          shadow={todayFiled ? "rgba(16,185,129,0.28)" : "rgba(245,158,11,0.28)"}
          icon={todayFiled ? <CheckIcon /> : <ClockIcon />}
          label={data.summaryCards[1]?.label ?? "DSR Today"}
          value={data.summaryCards[1]?.value ?? "Pending"}
          detail={data.summaryCards[1]?.detail ?? ""}
        />
        <StatCard
          gradient="linear-gradient(135deg,#0ea5e9,#6366f1)"
          shadow="rgba(14,165,233,0.28)"
          icon={<DocIcon />}
          label={data.summaryCards[2]?.label ?? "Total DSR"}
          value={data.summaryCards[2]?.value ?? "0"}
          detail={data.summaryCards[2]?.detail ?? ""}
        />
      </div>

      {/* ── Reminder alert ── */}
      <ReminderBanner message={data.reminderMessage} />

      {/* ── Assigned projects ── */}
      <div className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}>
        <div className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Assigned Projects</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800">Project Details</h2>
        </div>
        <div className="p-5">
          {data.projects.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.projects.map((p) => <EmployeeProjectCard key={p.id} project={p} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>📂</div>
              <p className="text-sm font-bold text-slate-600">No project assigned yet</p>
              <p className="mt-1 text-xs text-slate-400">Your manager will assign a project. You can still submit a General DSR.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Submit DSR form ── */}
      <div className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}>
        <div className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Daily Report</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800">Submit DSR</h2>
          <p className="mt-1 text-sm text-slate-500">Fill your daily status — what you did, any blockers, and tomorrow&apos;s plan.</p>
        </div>

        <div className="p-6">
          <form action={formAction} className="space-y-5">
            {state.error   && <Feedback>{state.error}</Feedback>}
            {state.success && <Feedback tone="success">{state.success}</Feedback>}

            {/* Row 1: date + project */}
            <div className="grid gap-4 sm:grid-cols-2">
              <DsrField icon={<CalIcon />} label="Work Date" name="workDate" placeholder="Select date" type="date"
                defaultValue={state.values?.workDate} />
              <DsrSelect icon={<FolderIcon2 />} label="Project" name="projectId"
                defaultValue={state.values?.projectId ?? ""}
                includePlaceholder placeholder="General Update"
                options={data.projects.map((p) => p.id)}
                labels={Object.fromEntries(data.projects.map((p) => [p.id, p.name]))} />
            </div>

            {/* Summary */}
            <DsrField icon={<TitleIcon />} label="What did you do today? (Summary)" name="summary"
              placeholder="Short heading — e.g. Completed API integration for module X"
              defaultValue={state.values?.summary} />

            {/* 3-column textarea grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DsrTextArea
                icon="✅"
                label="Completed Work"
                name="accomplishments"
                placeholder="List everything you finished today — features, fixes, reviews..."
                defaultValue={state.values?.accomplishments}
                required
              />
              <DsrTextArea
                icon="⚠️"
                label="Blockers / Dependencies"
                name="blockers"
                placeholder="Mention anything that slowed you down or needs resolution..."
                defaultValue={state.values?.blockers}
              />
              <DsrTextArea
                icon="📅"
                label="Tomorrow's Plan"
                name="nextPlan"
                placeholder="What will you work on next? Be specific..."
                defaultValue={state.values?.nextPlan}
              />
            </div>

            {/* Proof files */}
            <div>
              <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500">Proof Files (optional)</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
                style={{ borderColor: "rgba(99,102,241,0.2)" }}>
                <svg fill="none" height="18" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="text-sm text-slate-500">Click to attach proof (screenshots, documents…)</span>
                <input className="hidden" multiple name="attachments" type="file" />
              </label>
            </div>

            <button
              className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-10"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}
              disabled={pending}
              type="submit"
            >
              {pending ? "Submitting…" : "✓ Submit DSR"}
            </button>
          </form>
        </div>
      </div>

      {/* ── DSR History ── */}
      <div className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Recent DSR</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">My History</h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[0.65rem] font-bold"
            style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}>
            {data.updates.length} entries
          </span>
        </div>

        {data.updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
              style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>📋</div>
            <p className="text-sm font-bold text-slate-600">No DSR entries yet</p>
            <p className="mt-1 text-xs text-slate-400">Submit your first report above. It&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.updates.map((entry) => (
              <DsrHistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ADMIN / REVIEW DSR PANEL
══════════════════════════════════════════════ */
function DsrReviewPanel({
  data,
  simplifiedReview,
}: {
  data: Extract<DsrPageData, { mode: "review" }>;
  simplifiedReview: boolean;
}) {
  const submittedEmployees = dedupeSubmittedEmployees(data.updates);

  const statCards = simplifiedReview
    ? [
        { label: "Submitted Today", value: String(submittedEmployees.length), detail: "Employees who filled DSR today.", gradient: "linear-gradient(135deg,#10b981,#34d399)", shadow: "rgba(16,185,129,0.28)", icon: <CheckIcon /> },
        { label: "Missing Today",   value: String(data.missingEmployees.length), detail: "Employees who have not submitted.", gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)", shadow: "rgba(245,158,11,0.28)", icon: <ClockIcon /> },
      ]
    : data.summaryCards.map((c, i) => ({
        ...c,
        gradient: ["linear-gradient(135deg,#6366f1,#818cf8)","linear-gradient(135deg,#10b981,#34d399)","linear-gradient(135deg,#f59e0b,#fbbf24)"][i % 3],
        shadow: ["rgba(99,102,241,0.28)","rgba(16,185,129,0.28)","rgba(245,158,11,0.28)"][i % 3],
        icon: [<DocIcon key="d"/>,<CheckIcon key="c"/>,<ClockIcon key="cl"/>][i % 3],
      }));

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Stat cards */}
      <div className={`grid gap-3 ${statCards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {statCards.map((c) => (
          <StatCard key={c.label} gradient={c.gradient} shadow={c.shadow} icon={c.icon} label={c.label} value={c.value} detail={c.detail} />
        ))}
      </div>

      {!simplifiedReview && (
        <ReminderBanner message={(data as Extract<DsrPageData, { mode: "review" }>).reminderMessage} />
      )}

      {/* Missing DSR employees */}
      <div className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}>
        <div className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#fffbf0 0%,#fef3c7 100%)", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#d97706" }}>Pending</p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Missing DSR Today</h2>
            <span className="rounded-full px-3 py-1.5 text-[0.65rem] font-bold"
              style={{ background: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.25)" }}>
              {data.missingEmployees.length} pending
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {data.missingEmployees.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-10">
              <span className="text-2xl">🎉</span>
              <p className="text-sm font-semibold text-emerald-600">Everyone has submitted DSR today!</p>
            </div>
          ) : (
            data.missingEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-amber-50/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
                  {getInitials(emp.employeeName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{emp.employeeName}</p>
                  <p className="text-[0.72rem] text-slate-400">{emp.employeeEmail}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}>
                  Not Submitted
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submitted DSR cards */}
      <div className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}>
        <div className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)", borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#059669" }}>Review Feed</p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Today&apos;s Submissions</h2>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[0.65rem] font-bold text-emerald-600">{data.updates.length} submitted</span>
            </div>
          </div>
        </div>

        {data.updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
              style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>📋</div>
            <p className="text-sm font-bold text-slate-600">No submissions yet today</p>
            <p className="mt-1 text-xs text-slate-400">Employee DSRs will appear here as they submit.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.updates.map((entry) => (
              <AdminDsrCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════ */

function DsrHistoryCard({ entry }: { entry: { id: string; workDate: string; projectName: string; summary: string; accomplishments: string; blockers: string; nextPlan: string; attachments: { name: string; url: string }[] } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="transition-colors hover:bg-slate-50/50">
      <button
        className="flex w-full items-start gap-4 px-6 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
          {entry.workDate.slice(8)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{entry.workDate}</span>
            {entry.projectName && (
              <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase"
                style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.15)" }}>
                {entry.projectName}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">{entry.summary}</p>
        </div>
        <span className="text-slate-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </button>

      {open && (
        <div className="mx-6 mb-4 grid gap-3 rounded-xl p-4 sm:grid-cols-3"
          style={{ background: "rgba(241,245,249,0.7)", border: "1px solid rgba(226,232,240,0.8)" }}>
          <DSRBlock icon="✅" label="Completed Work" text={entry.accomplishments} />
          <DSRBlock icon="⚠️" label="Blockers" text={entry.blockers || "No blockers"} />
          <DSRBlock icon="📅" label="Tomorrow's Plan" text={entry.nextPlan || "Not added"} />
          {entry.attachments.length > 0 && (
            <div className="sm:col-span-3">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Proof Files</p>
              <div className="flex flex-wrap gap-2">
                {entry.attachments.map((a) => (
                  <a key={a.url} href={a.url} rel="noreferrer" target="_blank"
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}>
                    📎 {a.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDsrCard({ entry }: { entry: Extract<DsrPageData, { mode: "review" }>["updates"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="transition-colors hover:bg-slate-50/40">
      <button
        className="flex w-full items-start gap-4 px-6 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg,${avatarGrad(entry.employeeName)})` }}>
          {getInitials(entry.employeeName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800">{entry.employeeName}</span>
            <span className="text-[0.7rem] text-slate-400">{entry.employeeEmail}</span>
            <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
              style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}>
              {entry.workDate}
            </span>
            {entry.projectName && (
              <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
                style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.15)" }}>
                {entry.projectName}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">{entry.summary}</p>
        </div>
        <span className="shrink-0 text-slate-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </button>

      {open && (
        <div className="mx-6 mb-4 grid gap-3 rounded-xl p-4 sm:grid-cols-3"
          style={{ background: "rgba(241,245,249,0.7)", border: "1px solid rgba(226,232,240,0.8)" }}>
          <DSRBlock icon="✅" label="What They Completed" text={entry.accomplishments} />
          <DSRBlock icon="⚠️" label="Blockers Reported" text={entry.blockers || "No blockers"} />
          <DSRBlock icon="📅" label="Tomorrow's Plan" text={entry.nextPlan || "Not added"} />
          {entry.attachments.length > 0 && (
            <div className="sm:col-span-3">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Proof Files</p>
              <div className="flex flex-wrap gap-2">
                {entry.attachments.map((a) => (
                  <a key={a.url} href={a.url} rel="noreferrer" target="_blank"
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}>
                    📎 {a.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DSRBlock({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="rounded-xl bg-white p-3.5" style={{ border: "1px solid rgba(226,232,240,0.8)" }}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">
        <span>{icon}</span>{label}
      </p>
      <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">{text}</p>
    </div>
  );
}

function EmployeeProjectCard({ project }: { project: EmployeeProjectView }) {
  const sc = STATUS_SC[project.status] ?? STATUS_SC.PLANNING;
  return (
    <article className="relative overflow-hidden rounded-[1.3rem] p-5"
      style={{ border: "1px solid rgba(226,232,240,0.9)", background: "#fff", boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }}>
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-[1.3rem]" style={{ background: sc.gradient }} />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-white"
          style={{ background: sc.gradient, boxShadow: `0 4px 10px ${sc.shadow}` }}>
          {project.status.replace(/_/g, " ")}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
          style={{
            background: project.priority === "HIGH" ? "rgba(239,68,68,0.09)" : project.priority === "MEDIUM" ? "rgba(245,158,11,0.09)" : "rgba(100,116,139,0.09)",
            color: project.priority === "HIGH" ? "#dc2626" : project.priority === "MEDIUM" ? "#d97706" : "#475569",
            border: `1px solid ${project.priority === "HIGH" ? "rgba(239,68,68,0.2)" : project.priority === "MEDIUM" ? "rgba(245,158,11,0.2)" : "rgba(100,116,139,0.2)"}`,
          }}>
          {project.priority}
        </span>
      </div>
      <h3 className="mt-3 font-bold text-slate-800">{project.name}</h3>
      <p className="mt-1.5 text-[0.82rem] leading-5 text-slate-500 line-clamp-2">{project.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {project.techStack.slice(0, 3).map((t) => (
          <span key={t} className="rounded-lg px-2 py-0.5 text-[0.6rem] font-semibold uppercase"
            style={{ background: "rgba(99,102,241,0.07)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.12)" }}>{t}</span>
        ))}
        {project.dueDate && project.dueDate !== "—" && (
          <span className="ml-auto text-[0.7rem] font-semibold text-slate-400">Due {project.dueDate}</span>
        )}
      </div>
    </article>
  );
}

function StatCard({ gradient, shadow, icon, label, value, detail }: {
  gradient: string; shadow: string; icon: ReactNode; label: string; value: string; detail: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 text-white"
      style={{ background: gradient, boxShadow: `0 8px 24px ${shadow}` }}>
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">{icon}</div>
        <div className="min-w-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em] text-white/70">{label}</p>
          <p className="mt-0.5 text-3xl font-black leading-none text-white">{value}</p>
          <p className="mt-1 text-[0.68rem] text-white/60 leading-4">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ReminderBanner({ message }: { message: string }) {
  const isPending = message.toLowerCase().includes("pending") || message.toLowerCase().includes("not yet");
  return (
    <div className="flex items-start gap-3 rounded-[1.3rem] px-5 py-4"
      style={isPending
        ? { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }
        : { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }
      }>
      <span className="text-lg">{isPending ? "⏳" : "✅"}</span>
      <p className="text-sm font-semibold" style={{ color: isPending ? "#d97706" : "#4f46e5" }}>{message}</p>
    </div>
  );
}

/* ── Form helpers ── */
function DsrField({ icon, label, name, placeholder, type = "text", defaultValue }: {
  icon?: ReactNode; label: string; name: string; placeholder: string; type?: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>{label}</label>
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        {icon && <span className="pointer-events-none absolute left-3.5 text-indigo-400">{icon}</span>}
        <input
          className={`min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${icon ? "pl-9 pr-4" : "px-4"} ${type === "date" ? "scheme-light" : ""}`}
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          required={type !== "date" || name === "workDate"}
          type={type}
        />
      </div>
    </div>
  );
}

function DsrTextArea({ icon, label, name, placeholder, defaultValue, required = false }: {
  icon: string; label: string; name: string; placeholder: string; defaultValue?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>
        <span>{icon}</span>{label}
      </label>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        <textarea
          className="min-h-32 w-full bg-transparent px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          defaultValue={defaultValue}
          id={name}
          name={name}
          placeholder={placeholder}
          required={required}
        />
      </div>
    </div>
  );
}

function DsrSelect({ icon, label, name, defaultValue, includePlaceholder, placeholder, options, labels }: {
  icon?: ReactNode; label: string; name: string; defaultValue: string;
  includePlaceholder?: boolean; placeholder?: string; options: string[]; labels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={name}>{label}</label>
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
        {icon && <span className="pointer-events-none absolute left-3.5 text-indigo-400">{icon}</span>}
        <select
          className={`w-full appearance-none bg-transparent py-3 pr-8 text-sm text-slate-800 outline-none ${icon ? "pl-9" : "pl-4"}`}
          defaultValue={defaultValue}
          id={name}
          name={name}
        >
          {includePlaceholder && <option value="">{placeholder ?? "Select"}</option>}
          {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 text-slate-400">
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="13"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function avatarGrad(name: string) {
  const g = ["#6366f1,#8b5cf6","#0ea5e9,#6366f1","#10b981,#0d9488","#f59e0b,#ef4444","#ec4899,#8b5cf6"];
  return g[name.charCodeAt(0) % g.length];
}

function dedupeSubmittedEmployees(updates: Extract<DsrPageData, { mode: "review" }>["updates"]) {
  const seen = new Set<string>();
  return updates.filter((u) => { if (seen.has(u.employeeEmail)) return false; seen.add(u.employeeEmail); return true; });
}

function getInitials(value: string) {
  return value.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

/* ── Icons ── */
function FolderIcon()  { return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>; }
function FolderIcon2() { return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>; }
function CheckIcon()   { return <svg fill="none" height="18" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24" width="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>; }
function ClockIcon()   { return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }
function DocIcon()     { return <svg fill="none" height="18" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /></svg>; }
function CalIcon()     { return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>; }
function TitleIcon()   { return <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14"><line x1="21" x2="3" y1="6" y2="6" /><line x1="15" x2="3" y1="12" y2="12" /><line x1="17" x2="3" y1="18" y2="18" /></svg>; }
