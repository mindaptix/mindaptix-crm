"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportsPageData } from "@/features/dashboard/types";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<string, { bg: string; text: string; border: string }> = {
  HIGH:   { bg: "rgba(239,68,68,0.08)",   text: "#dc2626", border: "rgba(239,68,68,0.2)" },
  MEDIUM: { bg: "rgba(245,158,11,0.08)",  text: "#d97706", border: "rgba(245,158,11,0.2)" },
  LOW:    { bg: "rgba(100,116,139,0.08)", text: "#475569", border: "rgba(100,116,139,0.2)" },
};

const TASK_STATUS_CFG: Record<string, { bg: string; text: string }> = {
  COMPLETED:   { bg: "rgba(16,185,129,0.1)",  text: "#059669" },
  IN_PROGRESS: { bg: "rgba(99,102,241,0.1)",  text: "#4f46e5" },
  PENDING:     { bg: "rgba(245,158,11,0.1)",  text: "#d97706" },
  NOT_STARTED: { bg: "rgba(100,116,139,0.08)", text: "#475569" },
};

const ATTENDANCE_CFG: Record<string, { bg: string; text: string }> = {
  "Present + Checkout": { bg: "rgba(16,185,129,0.1)",  text: "#059669" },
  "Present":            { bg: "rgba(99,102,241,0.1)",  text: "#4f46e5" },
  "On Leave":           { bg: "rgba(245,158,11,0.1)",  text: "#d97706" },
  "Not Marked":         { bg: "rgba(148,163,184,0.08)", text: "#94a3b8" },
};

const SUMMARY_GRADS = [
  { gradient: "linear-gradient(135deg,#6366f1,#818cf8)", shadow: "rgba(99,102,241,0.3)" },
  { gradient: "linear-gradient(135deg,#10b981,#34d399)", shadow: "rgba(16,185,129,0.3)" },
  { gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)", shadow: "rgba(245,158,11,0.28)" },
  { gradient: "linear-gradient(135deg,#3b82f6,#60a5fa)", shadow: "rgba(59,130,246,0.3)" },
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
}

function avatarGrad(name: string) {
  const grads = [
    "linear-gradient(135deg,#6366f1,#818cf8)",
    "linear-gradient(135deg,#10b981,#34d399)",
    "linear-gradient(135deg,#f59e0b,#fbbf24)",
    "linear-gradient(135deg,#ec4899,#f472b6)",
    "linear-gradient(135deg,#3b82f6,#60a5fa)",
    "linear-gradient(135deg,#8b5cf6,#a78bfa)",
  ];
  return grads[name.charCodeAt(0) % grads.length];
}

function triggerCSVDownload(rows: (string | number)[][], filename: string) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

type ReportsPanelProps = { data: ReportsPageData; simplifiedView?: boolean };
type DailyReportRow = ReportsPageData["monthlyEmployeeReports"][number]["dailyRows"][number];
type MonthlyDsrRow = ReportsPageData["monthlyEmployeeReports"][number]["dsrRows"][number];
type MonthlyEmployeeReport = ReportsPageData["monthlyEmployeeReports"][number];

function getDsrStatus(row: DailyReportRow, today: string): "filled" | "late" | "none" {
  if (row.dsrEntries.length > 0) return "filled";
  const attended = row.attendanceStatus === "Present" || row.attendanceStatus === "Present + Checkout";
  if (attended) return "late";
  if (row.date < today && row.attendanceStatus !== "On Leave") return "late";
  return "none";
}

function DsrStatusBadge({ row, today, compact = false }: { row: DailyReportRow; today: string; compact?: boolean }) {
  const status = getDsrStatus(row, today);
  if (status === "filled") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 font-bold text-emerald-700 ${compact ? "px-2 py-0.5 text-[0.62rem]" : "px-2.5 py-1 text-[0.68rem]"}`}>
        <svg fill="none" height="10" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="10"><polyline points="20 6 9 17 4 12" /></svg>
        Filled
      </span>
    );
  }
  if (status === "late") {
    return (
      <span className={`inline-flex items-center rounded-full border border-amber-200 bg-amber-50 font-bold text-amber-700 ${compact ? "px-2 py-0.5 text-[0.62rem]" : "px-2.5 py-1 text-[0.68rem]"}`}>
        Late bharo
      </span>
    );
  }
  return <span className={`text-slate-300 ${compact ? "text-[0.75rem]" : "text-[0.8rem]"}`}>—</span>;
}

function formatTimelineDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${month}-${day}-${year}`;
}

function AttendanceTimelineTable({ compact = false, rows, today }: { compact?: boolean; rows: DailyReportRow[]; today: string }) {
  const cellPad = compact ? "px-2.5 py-2.5" : "px-4 py-3";
  const headCls = `text-left font-bold uppercase tracking-wider text-[#6366f1] ${compact ? "px-2.5 py-2.5 text-[0.62rem]" : "px-4 py-3 text-[0.65rem]"}`;
  const bodyText = compact ? "text-[0.75rem]" : "text-[0.82rem]";
  const badgeText = compact ? "px-2 py-0.5 text-[0.58rem]" : "px-2.5 py-1 text-[0.65rem]";

  function statusLabel(status: string) {
    if (status === "Present + Checkout") return "Present+";
    if (status === "Not Marked") return "Pending";
    return status;
  }

  return (
    <div className={`thin-scrollbar ${compact ? "max-h-[360px] overflow-y-auto" : "overflow-x-auto"}`}>
      <table className="w-full border-separate border-spacing-0 text-sm" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: compact ? 108 : 118 }} />
          <col style={{ width: compact ? 88 : 96 }} />
          <col />
          <col />
          <col style={{ width: compact ? 76 : 88 }} />
          <col style={{ width: compact ? 86 : 96 }} />
        </colgroup>
        <thead className={compact ? "sticky top-0 z-10" : undefined}>
          <tr style={{ background: "linear-gradient(135deg,#f8faff,#eef4ff)" }}>
            {["Date", "Status", "Check In", "Check Out", "Projects", "DSR"].map((h) => (
              <th key={h} className={headCls}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const chip = ATTENDANCE_CFG[row.attendanceStatus] ?? ATTENDANCE_CFG["Not Marked"];
            return (
              <tr key={row.date} className="border-t border-slate-50 transition-colors hover:bg-slate-50/50">
                <td className={`${cellPad} overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-slate-700 ${bodyText}`}>
                  {formatTimelineDate(row.date)}
                </td>
                <td className={`${cellPad} overflow-hidden`}>
                  <span
                    className={`inline-flex max-w-full items-center rounded-full font-bold leading-tight ${badgeText}`}
                    style={{ background: chip.bg, color: chip.text }}
                  >
                    <span className="truncate">{statusLabel(row.attendanceStatus)}</span>
                  </span>
                </td>
                <td className={`${cellPad} overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 ${bodyText}`}>
                  {row.checkInAt === "Not marked" ? "—" : row.checkInAt}
                </td>
                <td className={`${cellPad} overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 ${bodyText}`}>
                  {row.checkOutAt === "Not marked" ? "—" : row.checkOutAt}
                </td>
                <td className={`${cellPad} overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 ${bodyText}`}>
                  {row.projectNames.length ? row.projectNames.join(", ") : "—"}
                </td>
                <td className={`${cellPad} whitespace-nowrap`}>
                  <DsrStatusBadge compact={compact} row={row} today={today} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DsrEntryCard({ dsr }: { dsr: MonthlyDsrRow }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2 border-b border-slate-50 bg-slate-50/60 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.72rem] font-bold text-slate-700">{dsr.workDate}</span>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[0.58rem] font-bold text-emerald-700">{dsr.projectName}</span>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.58rem] font-bold text-emerald-700">Filled</span>
      </div>
      <div className="space-y-2 p-4">
        {dsr.submittedAt && <p className="text-[0.62rem] font-semibold text-slate-400">Submitted {dsr.submittedAt}</p>}
        <p className="break-words text-[0.82rem] font-semibold leading-5 text-slate-800">{dsr.summary}</p>
        {dsr.accomplishments && (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="mt-0.5 break-words text-[0.72rem] leading-5 text-slate-600">{dsr.accomplishments}</p>
          </div>
        )}
        {dsr.blockers && <p className="break-words text-[0.68rem] font-semibold text-amber-700">Blockers: {dsr.blockers}</p>}
        {dsr.nextPlan && <p className="break-words text-[0.68rem] text-slate-500">Next: {dsr.nextPlan}</p>}
      </div>
    </div>
  );
}

function ExpandedEmployeeBanner({ emp, monthLabel }: { emp: MonthlyEmployeeReport; monthLabel: string }) {
  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4"
      style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", border: "1px solid rgba(99,102,241,0.12)" }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md"
        style={{ background: avatarGrad(emp.employeeName) }}
      >
        {initials(emp.employeeName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-slate-800">{emp.employeeName}</p>
        <p className="text-[0.72rem] text-slate-500">{emp.employeeEmail}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Present", value: String(emp.attendanceDays), color: "#10b981" },
          { label: "Leave", value: String(emp.leaveDays), color: "#f59e0b" },
          { label: "DSR", value: String(emp.dsrRows.length), color: "#6366f1" },
          { label: "Tasks", value: `${emp.completedTaskCount}/${emp.taskCount}`, color: "#3b82f6" },
        ].map((chip) => (
          <div key={chip.label} className="rounded-xl border border-white bg-white/80 px-3 py-2 text-center shadow-sm">
            <p className="text-base font-black" style={{ color: chip.color }}>{chip.value}</p>
            <p className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-400">{chip.label}</p>
          </div>
        ))}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-center">
          <p className="text-[0.58rem] font-bold uppercase tracking-wider text-indigo-500">{monthLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function ReportsPanel({ data, simplifiedView = false }: ReportsPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState(data.reportMonths[0]?.key ?? "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(data.monthlyEmployeeReports[0]?.id ?? "");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const today = useMemo(() => formatIndiaDateKey(new Date()), []);
  const activeReport = useMemo(
    () =>
      data.reportMonths.find((month) => month.key === selectedMonthKey) ?? data.reportMonths[0] ?? {
        key: "",
        label: data.monthLabel,
        summaryCards: data.summaryCards,
        monthlyEmployeeRows: data.monthlyEmployeeRows,
        monthlyEmployeeReports: data.monthlyEmployeeReports,
      },
    [data.monthLabel, data.monthlyEmployeeReports, data.monthlyEmployeeRows, data.reportMonths, data.summaryCards, selectedMonthKey],
  );

  useEffect(() => {
    if (!activeReport.monthlyEmployeeReports.some((row) => row.id === selectedEmployeeId)) {
      setSelectedEmployeeId(activeReport.monthlyEmployeeReports[0]?.id ?? "");
    }
    setExpandedEmployeeId(null);
  }, [activeReport, selectedEmployeeId]);

  const filteredMonthlyReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeReport.monthlyEmployeeReports.filter((row) => {
      if (!q) return true;
      return [row.employeeName, row.employeeEmail, ...row.taskRows.map((t) => t.title), ...row.dsrRows.map((d) => `${d.projectName} ${d.summary}`)].join(" ").toLowerCase().includes(q);
    });
  }, [activeReport.monthlyEmployeeReports, search]);

  const selectedMonthlyReport = filteredMonthlyReports.find((r) => r.id === selectedEmployeeId) ?? filteredMonthlyReports[0] ?? null;

  const downloadCSV = useCallback(() => {
    triggerCSVDownload(
      [
        ["Employee", "Email", "Attendance Days", "Completed Days", "Leave Days", "Tasks", "Completed Tasks"],
        ...activeReport.monthlyEmployeeRows.map((r) => [r.employeeName, r.employeeEmail, r.attendanceDays, r.completedAttendanceDays, r.leaveDays, r.taskCount, r.completedTaskCount]),
      ],
      `employee-report-${activeReport.label}.csv`,
    );
  }, [activeReport.monthlyEmployeeRows, activeReport.label]);

  // ── Employee simplified view ────────────────────────────────────────────────
  if (simplifiedView) {
    const notMarkedCount = selectedMonthlyReport?.dailyRows.filter((r) => r.attendanceStatus === "Not Marked").length ?? 0;
    const empCards = selectedMonthlyReport
      ? [
          { label: "Present Days",  value: String(selectedMonthlyReport.attendanceDays),        detail: "Attendance marked this month",     gradient: "linear-gradient(135deg,#10b981,#0d9488)", shadow: "rgba(16,185,129,0.3)" },
          { label: "Not Marked",    value: String(notMarkedCount),                               detail: "Days with no attendance entry",    gradient: "linear-gradient(135deg,#ef4444,#dc2626)", shadow: "rgba(239,68,68,0.3)" },
          { label: "Leave Days",    value: String(selectedMonthlyReport.leaveDays),              detail: "Approved leave days this month",   gradient: "linear-gradient(135deg,#f59e0b,#d97706)", shadow: "rgba(245,158,11,0.28)" },
          { label: "DSR Filled",    value: String(selectedMonthlyReport.dsrRows.length),         detail: "Daily work reports submitted",     gradient: "linear-gradient(135deg,#6366f1,#4f46e5)", shadow: "rgba(99,102,241,0.3)" },
        ]
      : [];

    return (
      <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

        {/* Hero */}
        <div
          className="overflow-hidden rounded-[1.8rem]"
          style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 60%,#4338ca 100%)", boxShadow: "0 12px 40px rgba(99,102,241,0.35)" }}
        >
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-indigo-200">Monthly Report</p>
              <h1 className="mt-1.5 text-2xl font-black text-white">{activeReport.label} Employee Report</h1>
              <p className="mt-1.5 max-w-lg text-[0.78rem] leading-5 text-indigo-200">
                Month-to-date summary: attendance, leave days, tasks, and DSR submissions.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-[0.73rem] font-bold text-white transition hover:bg-white/25"
                onClick={downloadCSV}
                type="button"
              >
                <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Export CSV
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[0.73rem] font-bold text-indigo-700 transition hover:bg-indigo-50"
                onClick={() => window.print()}
                type="button"
              >
                <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect height="8" width="12" x="6" y="14" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          {/* Search + Employee */}
          <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-4 sm:flex-row sm:items-end sm:px-7">
            <div className="relative flex flex-1 items-center">
              <svg className="pointer-events-none absolute left-3.5 text-white/50" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/15"
                placeholder="Search employee, project, task, or DSR…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:min-w-[200px] sm:w-auto">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-indigo-200">Month</p>
              <select
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 scheme-dark"
                value={activeReport.key}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
              >
                {data.reportMonths.map((month) => (
                  <option key={month.key} value={month.key} style={{ background: "#1e1b4b" }}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:min-w-[200px] sm:w-auto">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-indigo-200">Employee</p>
              <select
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 scheme-dark"
                value={selectedMonthlyReport?.id ?? ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                {filteredMonthlyReports.map((r) => (
                  <option key={r.id} value={r.id} style={{ background: "#1e1b4b" }}>{r.employeeName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedMonthlyReport ? (
          <>
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {empCards.map((card) => (
                <div
                  key={card.label}
                  className="relative overflow-hidden rounded-3xl p-5 text-white"
                  style={{ background: card.gradient, boxShadow: `0 8px 24px ${card.shadow}` }}
                >
                  <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em] text-white/70">{card.label}</p>
                  <p className="mt-1 text-4xl font-black text-white">{card.value}</p>
                  <p className="mt-1 text-[0.68rem] text-white/60">{card.detail}</p>
                </div>
              ))}
            </div>

            {/* Attendance Timeline */}
            <div
              className="overflow-hidden rounded-[1.8rem]"
              style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
            >
              <div
                className="flex flex-wrap items-end justify-between gap-3 px-7 py-5"
                style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
              >
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Employee Sheet</p>
                  <h2 className="mt-0.5 text-2xl font-bold text-slate-800">{selectedMonthlyReport.employeeName}</h2>
                  <p className="text-sm text-slate-500">{selectedMonthlyReport.employeeEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">{activeReport.label}</span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-indigo-700">Month To Date</span>
                </div>
              </div>
              <div className="p-6">
                <p className="mb-4 text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Attendance Timeline</p>
                <div className="rounded-2xl border border-slate-100">
                  <AttendanceTimelineTable rows={selectedMonthlyReport.dailyRows} today={today} />
                </div>
              </div>
            </div>

            {/* Tasks + DSR */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Tasks */}
              <div
                className="overflow-hidden rounded-[1.8rem]"
                style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
              >
                <div className="px-6 py-5" style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Monthly Tasks</p>
                  <h3 className="mt-0.5 text-xl font-bold text-slate-800">Assigned Tasks</h3>
                  <p className="text-sm text-slate-500">{selectedMonthlyReport.taskRows.length} task{selectedMonthlyReport.taskRows.length !== 1 ? "s" : ""} this month</p>
                </div>
                <div className="space-y-2.5 p-5">
                  {selectedMonthlyReport.taskRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No tasks assigned this month.</p>
                  ) : selectedMonthlyReport.taskRows.map((task) => {
                    const isOverdue = task.status !== "COMPLETED" && task.dueDate < new Date().toISOString().slice(0, 10);
                    const pc = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
                    const sc = isOverdue ? { bg: "rgba(239,68,68,0.1)", text: "#dc2626" } : TASK_STATUS_CFG[task.status] ?? TASK_STATUS_CFG.PENDING;
                    return (
                      <div key={task.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-4 transition-colors hover:bg-slate-50/50">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{task.title}</p>
                          <p className="mt-0.5 text-[0.68rem] text-slate-400">{task.dueDate}</p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>{task.priority}</span>
                          <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: sc.bg, color: sc.text }}>
                            {isOverdue ? "OVERDUE" : task.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DSR */}
              <div
                className="overflow-hidden rounded-[1.8rem]"
                style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
              >
                <div className="px-6 py-5" style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#059669" }}>Monthly DSR</p>
                  <h3 className="mt-0.5 text-xl font-bold text-slate-800">{selectedMonthlyReport.employeeName} — Work Reports</h3>
                  <p className="text-sm text-slate-500">{selectedMonthlyReport.dsrRows.length} entr{selectedMonthlyReport.dsrRows.length !== 1 ? "ies" : "y"} this month</p>
                </div>
                <div className="max-h-[440px] space-y-3 overflow-y-auto p-5">
                  {selectedMonthlyReport.dsrRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No DSR submitted this month.</p>
                  ) : selectedMonthlyReport.dsrRows.map((dsr) => (
                    <DsrEntryCard key={dsr.id} dsr={dsr} />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-sm text-slate-500">No employee report found for the current search.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Admin / Manager view ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Hero header with download buttons */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 60%,#4338ca 100%)", boxShadow: "0 12px 40px rgba(99,102,241,0.35)" }}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-indigo-200">Monthly Report</p>
            <h1 className="mt-1.5 text-2xl font-black text-white">{activeReport.label} — Employee Reports</h1>
            <p className="mt-1.5 max-w-lg text-[0.78rem] leading-5 text-indigo-200">
              Per-employee monthly attendance and DSR summary. Click any employee to expand their daily log.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-[0.73rem] font-bold text-white transition hover:bg-white/25"
              onClick={downloadCSV}
              type="button"
            >
              <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Export CSV
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[0.73rem] font-bold text-indigo-700 transition hover:bg-indigo-50"
              onClick={() => window.print()}
              type="button"
            >
              <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect height="8" width="12" x="6" y="14" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-4 sm:flex-row sm:items-end sm:px-7">
          <div className="relative flex flex-1 items-center">
            <svg className="pointer-events-none absolute left-3.5 text-white/50" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/15"
              placeholder="Search employee name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:min-w-[220px] sm:w-auto">
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-indigo-200">Report Month</p>
            <select
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 scheme-dark"
              value={activeReport.key}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
            >
              {data.reportMonths.map((month) => (
                <option key={month.key} value={month.key} style={{ background: "#1e1b4b" }}>{month.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {activeReport.summaryCards.map((card, i) => {
          const g = SUMMARY_GRADS[i % SUMMARY_GRADS.length];
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-3xl p-5 text-white"
              style={{ background: g.gradient, boxShadow: `0 8px 24px ${g.shadow}` }}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em] text-white/70">{card.label}</p>
              <p className="mt-1 text-4xl font-black text-white">{card.value}</p>
              <p className="mt-1 text-[0.68rem] text-white/60">{card.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Employee Reports — accordion */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
      >
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
        >
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Monthly Overview</p>
          <h2 className="mt-0.5 text-2xl font-bold text-slate-800">Employee Attendance &amp; DSR</h2>
          <p className="text-sm text-slate-500">Click on an employee row to view their daily attendance log and DSR entries.</p>
        </div>

        {filteredMonthlyReports.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No employee reports found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMonthlyReports.map((emp) => {
              const isExpanded = expandedEmployeeId === emp.id;
              const totalDays = emp.dailyRows.length;
              const attPct = totalDays > 0 ? Math.round((emp.attendanceDays / totalDays) * 100) : 0;
              const attBarColor = attPct >= 70 ? "#10b981" : attPct >= 40 ? "#f59e0b" : "#ef4444";

              return (
                <div key={emp.id}>
                  {/* Summary row — clickable */}
                  <button
                    className="w-full px-6 py-4 text-left transition-colors hover:bg-slate-50/70"
                    onClick={() => setExpandedEmployeeId(isExpanded ? null : emp.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
                        style={{ background: avatarGrad(emp.employeeName) }}
                      >
                        {initials(emp.employeeName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">{emp.employeeName}</p>
                        <p className="text-[0.68rem] text-slate-400">{emp.employeeEmail}</p>
                      </div>

                      <div className="hidden items-center gap-6 sm:flex">
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-800">{emp.attendanceDays}</p>
                          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Present</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-800">{emp.leaveDays}</p>
                          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Leave</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-800">{emp.dsrRows.length}</p>
                          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">DSR</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-800">{emp.completedTaskCount}/{emp.taskCount}</p>
                          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Tasks</p>
                        </div>
                      </div>

                      <div className="hidden w-28 flex-col gap-1 xl:flex">
                        <div className="flex items-center justify-between">
                          <p className="text-[0.6rem] text-slate-400">Attendance</p>
                          <p className="text-[0.6rem] font-bold" style={{ color: attBarColor }}>{attPct}%</p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${attPct}%`, background: attBarColor }} />
                        </div>
                      </div>

                      <svg
                        className="shrink-0 text-slate-400 transition-transform duration-200"
                        fill="none"
                        height="16"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        viewBox="0 0 24 24"
                        width="16"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 px-6 pb-6 pt-5">
                      <ExpandedEmployeeBanner emp={emp} monthLabel={activeReport.label} />
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">

                        {/* Daily attendance timeline */}
                        <div
                          className="overflow-hidden rounded-2xl"
                          style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff" }}
                        >
                          <div
                            className="px-5 py-4"
                            style={{ background: "linear-gradient(135deg,#f8faff,#eef4ff)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
                          >
                            <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Attendance Timeline</p>
                            <h3 className="mt-0.5 text-base font-bold text-slate-800">{emp.employeeName} — Daily Log</h3>
                          </div>
                          <AttendanceTimelineTable compact rows={emp.dailyRows} today={today} />
                        </div>

                        {/* DSR entries */}
                        <div
                          className="overflow-hidden rounded-2xl"
                          style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff" }}
                        >
                          <div
                            className="px-5 py-4"
                            style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderBottom: "1px solid rgba(16,185,129,0.1)" }}
                          >
                            <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#059669" }}>DSR Entries</p>
                            <h3 className="mt-0.5 text-base font-bold text-slate-800">
                              {emp.employeeName} — {emp.dsrRows.length} Report{emp.dsrRows.length !== 1 ? "s" : ""}
                            </h3>
                          </div>
                          <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
                            {emp.dsrRows.length === 0 ? (
                              <p className="py-8 text-center text-sm text-slate-400">No DSR submitted this month.</p>
                            ) : emp.dsrRows.map((dsr) => (
                              <DsrEntryCard key={dsr.id} dsr={dsr} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

