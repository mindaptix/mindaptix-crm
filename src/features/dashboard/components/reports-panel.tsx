"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import type { PerformanceScoreRow, ReportsPageData } from "@/features/dashboard/types";

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

const LEAVE_CFG: Record<string, { bg: string; text: string }> = {
  APPROVED: { bg: "rgba(16,185,129,0.1)",  text: "#059669" },
  REJECTED: { bg: "rgba(239,68,68,0.1)",   text: "#dc2626" },
  PENDING:  { bg: "rgba(245,158,11,0.1)",  text: "#d97706" },
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

function scoreGrad(score: number) {
  if (score >= 80) return "linear-gradient(135deg,#10b981,#059669)";
  if (score >= 60) return "linear-gradient(135deg,#f59e0b,#d97706)";
  return "linear-gradient(135deg,#ef4444,#dc2626)";
}

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

export function ReportsPanel({ data, simplifiedView = false }: ReportsPanelProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(data.monthlyEmployeeReports[0]?.id ?? "");

  const filteredLeaves = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.leaveRows.filter((leave) => {
      const matchesDate = !dateFilter || leave.startDate <= dateFilter;
      const matchesQuery = !q || [leave.employeeName, leave.employeeEmail, leave.leaveType, leave.status, leave.reason].join(" ").toLowerCase().includes(q);
      return matchesDate && matchesQuery;
    });
  }, [data.leaveRows, dateFilter, search]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.taskRows.filter((task) => {
      const matchesDate = !dateFilter || task.dueDate === dateFilter;
      const matchesQuery = !q || [task.title, task.description, task.assignedUserName, task.priority, task.labels.join(" ")].join(" ").toLowerCase().includes(q);
      return matchesDate && matchesQuery;
    });
  }, [data.taskRows, dateFilter, search]);

  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.attendanceRows.filter((row) => !q || row.employeeName.toLowerCase().includes(q));
  }, [data.attendanceRows, search]);

  const filteredMonthlyReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.monthlyEmployeeReports.filter((row) => {
      if (!q) return true;
      return [row.employeeName, row.employeeEmail, ...row.taskRows.map((t) => t.title), ...row.dsrRows.map((d) => `${d.projectName} ${d.summary}`)].join(" ").toLowerCase().includes(q);
    });
  }, [data.monthlyEmployeeReports, search]);

  const selectedMonthlyReport = filteredMonthlyReports.find((r) => r.id === selectedEmployeeId) ?? filteredMonthlyReports[0] ?? null;

  const downloadCSV = useCallback(() => {
    triggerCSVDownload(
      [
        ["Employee", "Email", "Attendance Days", "Completed Days", "Leave Days", "Tasks", "Completed Tasks"],
        ...data.monthlyEmployeeRows.map((r) => [r.employeeName, r.employeeEmail, r.attendanceDays, r.completedAttendanceDays, r.leaveDays, r.taskCount, r.completedTaskCount]),
      ],
      `employee-report-${data.monthLabel}.csv`,
    );
  }, [data.monthlyEmployeeRows, data.monthLabel]);

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
              <h1 className="mt-1.5 text-2xl font-black text-white">{data.monthLabel} Employee Report</h1>
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
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">{data.monthLabel}</span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-indigo-700">Month To Date</span>
                </div>
              </div>
              <div className="p-6">
                <p className="mb-4 text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Attendance Timeline</p>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg,#f8faff,#eef4ff)" }}>
                        {["Date", "Status", "Check In", "Check Out", "Projects", "DSR Summary"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[0.6rem] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "#6366f1" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonthlyReport.dailyRows.map((row) => {
                        const chip = ATTENDANCE_CFG[row.attendanceStatus] ?? ATTENDANCE_CFG["Not Marked"];
                        return (
                          <tr key={row.date} className="border-t border-slate-50 transition-colors hover:bg-slate-50/50">
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{row.date}</td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="rounded-full px-2.5 py-1 text-[0.62rem] font-bold" style={{ background: chip.bg, color: chip.text }}>{row.attendanceStatus}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.checkInAt}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.checkOutAt}</td>
                            <td className="max-w-[140px] px-4 py-3 text-slate-600 text-[0.78rem]">{row.projectNames.length ? row.projectNames.join(", ") : <span className="text-slate-300">—</span>}</td>
                            <td className="max-w-[220px] px-4 py-3 text-[0.78rem] leading-4 text-slate-500">{row.dsrSummary || <span className="text-slate-300">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  <h3 className="mt-0.5 text-xl font-bold text-slate-800">Work Reports</h3>
                  <p className="text-sm text-slate-500">{selectedMonthlyReport.dsrRows.length} entr{selectedMonthlyReport.dsrRows.length !== 1 ? "ies" : "y"} this month</p>
                </div>
                <div className="max-h-[440px] space-y-2.5 overflow-y-auto p-5">
                  {selectedMonthlyReport.dsrRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No DSR submitted this month.</p>
                  ) : selectedMonthlyReport.dsrRows.map((dsr) => (
                    <div key={dsr.id} className="rounded-2xl border border-slate-100 p-4 transition-colors hover:bg-slate-50/50">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[0.7rem] font-semibold text-slate-500">{dsr.workDate}</span>
                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[0.62rem] font-bold text-emerald-700">{dsr.projectName}</span>
                      </div>
                      <p className="text-[0.82rem] font-semibold leading-5 text-slate-700">{dsr.summary}</p>
                      {dsr.accomplishments && <p className="mt-1.5 text-[0.72rem] leading-4 text-slate-500">{dsr.accomplishments}</p>}
                      {dsr.blockers && <p className="mt-1.5 text-[0.68rem] text-amber-600">Blockers: {dsr.blockers}</p>}
                    </div>
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.summaryCards.map((card, i) => {
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

      {/* Weekly Snapshot */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
      >
        <div className="px-6 py-5" style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>Last 7 Days</p>
          <h2 className="mt-0.5 text-2xl font-bold text-slate-800">Weekly Snapshot</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 xl:grid-cols-5">
          {data.weeklySummaryCards.map((card, i) => {
            const colors = [
              { text: "#6366f1", bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.12)" },
              { text: "#10b981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.12)" },
              { text: "#f59e0b", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.12)" },
              { text: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.12)" },
              { text: "#ec4899", bg: "rgba(236,72,153,0.07)",  border: "rgba(236,72,153,0.12)" },
            ];
            const c = colors[i % colors.length];
            return (
              <div key={card.label} className="rounded-2xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em]" style={{ color: c.text }}>{card.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-800">{card.value}</p>
                <p className="mt-1 text-[0.68rem] text-slate-500 leading-4">{card.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Leaderboard */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
      >
        <div className="px-6 py-5" style={{ background: "linear-gradient(135deg,#fdf4ff 0%,#fae8ff 100%)", borderBottom: "1px solid rgba(168,85,247,0.1)" }}>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#9333ea" }}>Performance</p>
          <h2 className="mt-0.5 text-2xl font-bold text-slate-800">Employee Leaderboard</h2>
          <p className="text-sm text-slate-500">Score (0–100) based on attendance rate, task completion, and DSR consistency.</p>
        </div>
        {data.performanceRows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">Performance scores appear after activity is recorded.</p>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {data.performanceRows.map((row, idx) => (
              <PerformanceCard key={row.id} rank={idx + 1} row={row} />
            ))}
          </div>
        )}
      </div>

      {/* Search + date filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex flex-1 items-center">
          <svg className="pointer-events-none absolute left-3.5 text-slate-400" fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 placeholder:text-slate-400"
            placeholder="Search by employee, task, leave, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <svg className="pointer-events-none absolute left-3.5 text-slate-400" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <rect height="18" rx="2" ry="2" width="18" x="3" y="4" /><line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 scheme-light"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Three data cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

        {/* Attendance */}
        <ReportCard eyebrow="Attendance" eyebrowColor="#10b981" headerBg="linear-gradient(135deg,#f0fdf4,#dcfce7)" headerBorder="rgba(16,185,129,0.12)" title="Attendance Summary">
          {filteredAttendance.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No attendance data for the current filter.</p>
          ) : (
            <div className="space-y-2.5 p-5">
              {filteredAttendance.map((row) => {
                const pct = row.daysMarked > 0 ? Math.round((row.completedDays / row.daysMarked) * 100) : 0;
                const barColor = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={row.id} className="rounded-2xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold text-white" style={{ background: avatarGrad(row.employeeName) }}>
                          {initials(row.employeeName)}
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{row.employeeName}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: barColor }}>{row.daysMarked}d</span>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <p className="mt-1 text-[0.62rem] text-slate-400">{row.completedDays} with checkout · {row.daysMarked} days marked</p>
                  </div>
                );
              })}
            </div>
          )}
        </ReportCard>

        {/* Leaves */}
        <ReportCard eyebrow="Leave Report" eyebrowColor="#f59e0b" headerBg="linear-gradient(135deg,#fffbeb,#fef3c7)" headerBorder="rgba(245,158,11,0.12)" title="Leave Requests">
          {filteredLeaves.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No leave data for the current filter.</p>
          ) : (
            <div className="max-h-[440px] space-y-2.5 overflow-y-auto p-5">
              {filteredLeaves.map((leave) => {
                const chip = LEAVE_CFG[leave.status] ?? LEAVE_CFG.PENDING;
                return (
                  <div key={leave.id} className="rounded-2xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{leave.employeeName}</p>
                        <p className="text-[0.68rem] text-slate-400">{leave.leaveType}</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold" style={{ background: chip.bg, color: chip.text }}>{leave.status}</span>
                    </div>
                    <p className="mt-1.5 text-[0.7rem] text-slate-500">{leave.startDate} → {leave.endDate} · {leave.requestedDays}d</p>
                    {leave.reason && <p className="mt-1 line-clamp-2 text-[0.68rem] text-slate-400">{leave.reason}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </ReportCard>

        {/* Tasks */}
        <ReportCard eyebrow="Task Report" eyebrowColor="#3b82f6" headerBg="linear-gradient(135deg,#eff6ff,#dbeafe)" headerBorder="rgba(59,130,246,0.12)" title="Tasks Overview">
          {filteredTasks.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No task data for the current filter.</p>
          ) : (
            <div className="max-h-[440px] space-y-2.5 overflow-y-auto p-5">
              {filteredTasks.map((task) => {
                const isOv = task.isOverdue;
                const pc = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
                const sc = isOv ? { bg: "rgba(239,68,68,0.1)", text: "#dc2626" } : TASK_STATUS_CFG[task.status] ?? TASK_STATUS_CFG.PENDING;
                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50/50"
                    style={isOv ? { borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.02)" } : {}}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                        <p className="text-[0.68rem] text-slate-400">{task.assignedUserName}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>{task.priority}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[0.68rem] text-slate-400">{task.dueDate}</p>
                      <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold" style={{ background: sc.bg, color: sc.text }}>
                        {isOv ? "OVERDUE" : task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ReportCard>
      </div>
    </div>
  );
}

// ── Performance Card ──────────────────────────────────────────────────────────

function PerformanceCard({ rank, row }: { rank: number; row: PerformanceScoreRow }) {
  const sg = scoreGrad(row.score);
  return (
    <div
      className="relative overflow-hidden rounded-[1.4rem] p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: "1px solid rgba(226,232,240,0.9)", background: "#fff", boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }}
    >
      <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold text-white" style={{ background: sg }}>
        #{rank}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ background: avatarGrad(row.employeeName) }}>
          {initials(row.employeeName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-800">{row.employeeName}</p>
          <p className="truncate text-[0.68rem] text-slate-400">{row.employeeEmail}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Overall Score</p>
        <span className="rounded-full px-3 py-1 text-sm font-black text-white" style={{ background: sg }}>{row.score}</span>
      </div>
      <div className="mt-4 space-y-2.5">
        <ProgressBar color="#10b981" label="Attendance" value={row.attendanceRate} />
        <ProgressBar color="#6366f1" label="Tasks" value={row.taskCompletionRate} />
        <ProgressBar color="#3b82f6" label="DSR" value={row.dsrConsistencyRate} />
      </div>
    </div>
  );
}

function ProgressBar({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[0.62rem] text-slate-500">{label}</p>
        <p className="text-[0.62rem] font-bold" style={{ color }}>{value}%</p>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Report Card wrapper ───────────────────────────────────────────────────────

function ReportCard({ children, eyebrow, eyebrowColor, headerBg, headerBorder, title }: {
  children: ReactNode;
  eyebrow: string;
  eyebrowColor: string;
  headerBg: string;
  headerBorder: string;
  title: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-[1.8rem]"
      style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
    >
      <div className="px-6 py-5" style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}` }}>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em]" style={{ color: eyebrowColor }}>{eyebrow}</p>
        <h3 className="mt-0.5 text-xl font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}
