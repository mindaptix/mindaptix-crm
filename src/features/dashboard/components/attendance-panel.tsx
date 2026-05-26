"use client";

import { useEffect, useState } from "react";
import { checkInAttendance, checkOutAttendance } from "@/features/dashboard/actions/attendance";
import { FormActionButton } from "@/shared/ui/form-action-button";
import { DashboardTable, DashboardTableCell } from "@/shared/ui/dashboard-table";
import type { AttendancePageData } from "@/features/dashboard/types";

type AttendancePanelProps = {
  data: AttendancePageData;
};

const WORK_MODES = [
  { value: "OFFICE", label: "Office", icon: "🏢" },
  { value: "WFH",    label: "WFH",    icon: "🏠" },
  { value: "FIELD",  label: "Field",  icon: "🚗" },
] as const;

type WorkMode = "OFFICE" | "WFH" | "FIELD";

const MODE_BADGE: Record<WorkMode, string> = {
  OFFICE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  WFH:    "bg-violet-100  text-violet-700  border-violet-200",
  FIELD:  "bg-amber-100   text-amber-700   border-amber-200",
};

export function AttendancePanel({ data }: AttendancePanelProps) {
  const [workMode, setWorkMode] = useState<WorkMode>("OFFICE");

  const checkedIn  = !!data.todayRecord?.checkInAt  && data.todayRecord.checkInAt  !== "Not marked";
  const checkedOut = !!data.todayRecord?.checkOutAt && data.todayRecord.checkOutAt !== "Not marked";

  const presentToday = data.todayRecords.filter((r) => r.status !== "NOT_MARKED").length;
  const absentToday  = data.todayRecords.filter((r) => r.status === "NOT_MARKED").length;
  const lateToday    = data.todayRecords.filter((r) => r.isLate).length;
  const wfhToday     = data.todayRecords.filter((r) => r.workMode === "WFH").length;

  return (
    <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          gradient="from-emerald-500 to-teal-500"
          iconBg="bg-white/20"
          icon="✓"
          label="Present"
          value={presentToday}
        />
        <StatCard
          gradient="from-rose-500 to-pink-500"
          iconBg="bg-white/20"
          icon="✕"
          label="Absent"
          value={absentToday}
        />
        <StatCard
          gradient="from-amber-500 to-orange-500"
          iconBg="bg-white/20"
          icon="⏱"
          label="Late"
          value={lateToday}
        />
        <StatCard
          gradient="from-violet-500 to-purple-500"
          iconBg="bg-white/20"
          icon="🏠"
          label="WFH"
          value={wfhToday}
        />
      </div>

      {/* ── Main grid: widget + roster ── */}
      <div className={`grid gap-5 ${data.canMarkAttendance ? "xl:grid-cols-[400px_minmax(0,1fr)]" : ""}`}>

        {/* Check-in widget */}
        {data.canMarkAttendance && (
          <div
            className="overflow-hidden rounded-[1.8rem] text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
            style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e3a5f 45%,#0f4c81 100%)" }}
          >
            {/* Clock strip */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}
            >
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.32em] text-white/40">Today</p>
                <p className="mt-0.5 text-sm font-semibold text-white/75">
                  {data.todayRecord?.dateKey ?? new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <LiveClock />
            </div>

            <div className="px-6 pt-5">
              {/* Status pill */}
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-widest ${
                checkedOut ? "bg-slate-500/30 text-slate-300" :
                checkedIn  ? "bg-emerald-500/25 text-emerald-300" :
                             "bg-rose-500/25 text-rose-300"
              }`}
                style={{ border: checkedIn && !checkedOut ? "1px solid rgba(52,211,153,0.3)" : checkedOut ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(251,113,133,0.3)" }}
              >
                <span className={`h-2 w-2 rounded-full ${checkedOut ? "bg-slate-400" : checkedIn ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                {checkedOut ? "Checked Out" : checkedIn ? "Checked In" : "Not Checked In"}
              </div>
            </div>

            {/* Time boxes */}
            <div className="mt-4 grid grid-cols-2 gap-3 px-6">
              <TimeBox label="Check In"  time={data.todayRecord?.checkInAt  ?? null} accent="emerald" />
              <TimeBox label="Check Out" time={data.todayRecord?.checkOutAt ?? null} accent="sky" />
            </div>

            {/* Late warning */}
            {data.todayRecord?.isLate && (
              <div className="mx-6 mt-3 flex items-center gap-2.5 rounded-xl px-4 py-2.5"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <span className="text-base">⚠️</span>
                <p className="text-[0.7rem] font-semibold text-rose-300">
                  Late arrival — {data.todayRecord.lateByMinutes} min after scheduled time
                </p>
              </div>
            )}

            {/* Work mode */}
            <div className="mt-5 px-6">
              <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-white/40">Work Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {WORK_MODES.map((mode) => {
                  const active = workMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      className={`relative overflow-hidden rounded-xl py-3 text-center transition-all duration-200 ${
                        active
                          ? "shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                          : "opacity-50 hover:opacity-75"
                      }`}
                      style={active
                        ? { background: "linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))", border: "1px solid rgba(255,255,255,0.28)" }
                        : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
                      }
                      onClick={() => setWorkMode(mode.value)}
                      type="button"
                    >
                      <span className="block text-xl">{mode.icon}</span>
                      <span className="mt-1 block text-[0.58rem] font-bold uppercase tracking-wider text-white/80">{mode.label}</span>
                      {active && (
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-teal-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 grid grid-cols-2 gap-3 px-6 pb-6">
              <form action={checkInAttendance} className="contents">
                <input name="workMode" type="hidden" value={workMode} />
                <FormActionButton
                  className="w-full rounded-xl py-3.5 text-sm font-bold shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all hover:brightness-105 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#10b981,#0d9488)", color: "#fff", border: "none" }}
                  pendingLabel="Checking in…"
                  type="submit"
                >
                  ↗ Check In
                </FormActionButton>
              </form>
              <form action={checkOutAttendance} className="contents">
                <FormActionButton
                  className="w-full rounded-xl py-3.5 text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)", color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
                  pendingLabel="Checking out…"
                  type="submit"
                >
                  ↙ Check Out
                </FormActionButton>
              </form>
            </div>
          </div>
        )}

        {/* Today's roster */}
        <div className="overflow-hidden rounded-[1.8rem] shadow-[0_8px_40px_rgba(15,23,42,0.1)]"
          style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff" }}>
          {/* Header */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
            style={{
              background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)",
              borderBottom: "1px solid rgba(99,102,241,0.1)",
            }}
          >
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]"
                style={{ color: "#6366f1" }}>Live Roster</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-800">Today&apos;s Attendance</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[0.65rem] font-bold text-emerald-600">Live</span>
            </div>
          </div>

          {data.todayRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>
                📋
              </div>
              <p className="text-sm font-semibold text-slate-600">No attendance marked yet</p>
              <p className="mt-1 text-xs text-slate-400">Team members will appear here once they check in.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr style={{ background: "linear-gradient(90deg,#f8fafc,#f1f5f9)", borderBottom: "2px solid rgba(99,102,241,0.08)" }}>
                    <th className="px-5 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Employee</th>
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Check In</th>
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Check Out</th>
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Mode</th>
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayRecords.map((record, i) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-indigo-50/40"
                      style={{ borderBottom: "1px solid rgba(241,245,249,1)", background: i % 2 === 0 ? "#fff" : "rgba(248,250,255,0.6)" }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                            style={{ background: `linear-gradient(135deg,${avatarGrad(record.employeeName)})` }}
                          >
                            {record.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{record.employeeName}</p>
                            <p className="text-[0.7rem] text-slate-400">{record.employeeEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-700">{record.checkInAt || "—"}</p>
                        {record.isLate && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                            ⏱ Late +{record.lateByMinutes}m
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-500">{record.checkOutAt || <span className="text-slate-300">Not marked</span>}</p>
                      </td>
                      <td className="px-4 py-4">
                        {record.workMode ? (
                          <span className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider ${MODE_BADGE[record.workMode as WorkMode] ?? "border-slate-100 bg-slate-50 text-slate-500"}`}>
                            {record.workMode}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusChip status={record.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly report ── */}
      <div className="overflow-hidden rounded-[1.8rem] shadow-[0_8px_40px_rgba(15,23,42,0.08)]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff" }}>
        <div
          className="px-6 py-5"
          style={{
            background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
          }}
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em]" style={{ color: "#6366f1" }}>
            Monthly Summary
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-slate-800">Attendance Report</h2>
        </div>

        <DashboardTable
          columns={[
            { label: "Employee" },
            { label: "Days Present" },
            { label: "Completed Checkouts" },
            { label: "Attendance %" },
          ]}
          emptyMessage="Monthly attendance data will appear here once team members start checking in."
          hasRows={data.monthlyRows.length > 0}
        >
          {data.monthlyRows.map((row, i) => {
            const totalWorkingDays = 26;
            const pct = Math.round((row.daysMarked / totalWorkingDays) * 100);
            const barColor = pct >= 90 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";
            return (
              <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "rgba(248,250,255,0.5)", borderBottom: "1px solid #f1f5f9" }}>
                <DashboardTableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg,${avatarGrad(row.employeeName)})` }}
                    >
                      {row.employeeName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-800">{row.employeeName}</span>
                  </div>
                </DashboardTableCell>
                <DashboardTableCell>
                  <span className="text-base font-bold text-slate-800">{row.daysMarked}</span>
                  <span className="ml-1 text-xs text-slate-400">/ 26 days</span>
                </DashboardTableCell>
                <DashboardTableCell>
                  <span className="text-base font-bold text-slate-800">{row.completedDays}</span>
                  <span className="ml-1 text-xs text-slate-400">checkouts</span>
                </DashboardTableCell>
                <DashboardTableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg,${barColor},${barColor}cc)` }}
                      />
                    </div>
                    <span className="min-w-[2.5rem] text-sm font-bold" style={{ color: barColor }}>
                      {pct}%
                    </span>
                  </div>
                </DashboardTableCell>
              </tr>
            );
          })}
        </DashboardTable>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function avatarGrad(name: string): string {
  const gradients = [
    "#6366f1,#8b5cf6",
    "#0ea5e9,#6366f1",
    "#10b981,#0d9488",
    "#f59e0b,#ef4444",
    "#ec4899,#8b5cf6",
    "#14b8a6,#3b82f6",
    "#f97316,#ec4899",
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

/* ─── Sub-components ─── */

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right">
      <p className="font-mono text-2xl font-bold tracking-tight text-white">{time}</p>
      <p className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-white/35">Current Time</p>
    </div>
  );
}

function TimeBox({ label, time, accent }: { label: string; time: string | null; accent: "emerald" | "sky" }) {
  const accentColor = accent === "emerald" ? "rgba(52,211,153,0.5)" : "rgba(56,189,248,0.5)";
  const textColor   = accent === "emerald" ? "#6ee7b7" : "#7dd3fc";
  return (
    <div className="rounded-xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.24em]" style={{ color: accentColor }}>{label}</p>
      <p className={`mt-1.5 text-base font-bold`} style={{ color: time ? textColor : "rgba(255,255,255,0.2)" }}>
        {time ?? "Not marked"}
      </p>
    </div>
  );
}

function StatCard({ gradient, iconBg, icon, label, value }: {
  gradient: string; iconBg: string; icon: string; label: string; value: number;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-lg`}
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
    >
      {/* subtle bg circle */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em] text-white/70">{label}</p>
          <p className="text-2xl font-black leading-none text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    PRESENT:    { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" },
    NOT_MARKED: { bg: "rgba(239,68,68,0.08)",  color: "#dc2626", border: "rgba(239,68,68,0.2)"  },
    ON_LEAVE:   { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" },
    HALF_DAY:   { bg: "rgba(59,130,246,0.1)",  color: "#2563eb", border: "rgba(59,130,246,0.25)" },
  };
  const s = styles[status] ?? { bg: "rgba(148,163,184,0.1)", color: "#64748b", border: "rgba(148,163,184,0.2)" };
  const label = status.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {label}
    </span>
  );
}
