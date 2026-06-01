"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cancelCheckout, checkInAttendance, checkOutAttendance } from "@/features/dashboard/actions/attendance";
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

type GeoStatus = "idle" | "loading" | "error";

async function getBrowserLocation() {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    throw new Error("Is browser mein location support nahi hai. Location-enabled browser se try karein.");
  }

  // Try network-based location first (fast on mobile), then GPS fallback
  const tryGet = (highAccuracy: boolean, timeout: number) =>
    new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: highAccuracy ? 0 : 30000,
      }),
    );

  let position: GeolocationPosition;
  try {
    // Fast attempt: network/cell tower (works indoors, quick on mobile)
    position = await tryGet(false, 8000);
  } catch {
    // Fallback: GPS (more accurate but slower, mainly for outdoor)
    position = await tryGet(true, 20000);
  }

  return {
    accuracy: position.coords.accuracy,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

function getLocationErrorMessage(error: unknown, action: "check-in" | "check-out") {
  const actionText = action === "check-in" ? "attendance" : "check-out";
  const helpText = `Location access nahi mil pa rahi. Phone mein GPS/location on karein, browser permission Allow karein, aur app HTTPS/live domain par khol kar ${actionText} dobara try karein.`;

  if (error instanceof Error && error.message) {
    return `${helpText} (${error.message})`;
  }

  return helpText;
}

function formatWorkedHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function WorkedHoursStrip({ minutes }: { minutes: number }) {
  const REQUIRED = 9 * 60; // 9 hours in minutes
  const completed = minutes >= REQUIRED;
  const pct = Math.min(100, Math.round((minutes / REQUIRED) * 100));
  const label = formatWorkedHours(minutes);
  const remaining = REQUIRED - minutes;

  return (
    <div className="mx-6 mt-3 rounded-xl px-4 py-3"
      style={{
        background: completed ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
        border: completed ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(245,158,11,0.25)",
      }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{completed ? "✅" : "⏳"}</span>
          <p className="text-[0.7rem] font-bold" style={{ color: completed ? "#6ee7b7" : "#fcd34d" }}>
            {completed
              ? `${label} worked — Full day complete!`
              : `${label} worked — ${formatWorkedHours(remaining)} remaining`}
          </p>
        </div>
        <span className="text-[0.65rem] font-bold" style={{ color: completed ? "#6ee7b7" : "#fcd34d" }}>
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: completed
              ? "linear-gradient(90deg,#10b981,#34d399)"
              : "linear-gradient(90deg,#f59e0b,#fbbf24)",
          }}
        />
      </div>
    </div>
  );
}

function HoursCell({ minutes, status }: { minutes: number; status: string }) {
  if (status === "NOT_MARKED" || status === "PRESENT") {
    if (status === "PRESENT") {
      return (
        <span className="text-[0.65rem] font-semibold text-slate-400">In progress…</span>
      );
    }
    return <span className="text-slate-300 text-sm">—</span>;
  }
  const REQUIRED = 9 * 60;
  const completed = minutes >= REQUIRED;
  const label = formatWorkedHours(minutes);
  return (
    <div>
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-bold"
        style={
          completed
            ? { background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }
            : { background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }
        }
      >
        {completed ? "✓" : "⏱"} {label}
      </span>
      {!completed && (
        <p className="mt-0.5 text-[0.6rem] text-slate-400">
          {formatWorkedHours(REQUIRED - minutes)} short
        </p>
      )}
    </div>
  );
}

function AttendanceTimeCell({ datetime, dimmed = false }: { datetime: string; dimmed?: boolean }) {
  if (!datetime || datetime === "Not marked") {
    return <span className="text-sm text-slate-300">—</span>;
  }
  const parts = datetime.split(" · ");
  const datePart = parts[0] ?? datetime;
  const timePart = parts[1] ?? "";

  return (
    <div>
      <p className={`text-sm font-semibold ${dimmed ? "text-slate-500" : "text-slate-800"}`}>
        {timePart || datePart}
      </p>
      {timePart && (
        <p className="mt-0.5 text-[0.68rem] text-slate-400">{datePart}</p>
      )}
    </div>
  );
}

function LocationCell({
  location,
  status,
}: {
  location: { lat: number; lng: number; accuracy: number | null } | null;
  status: string;
}) {
  if (status === "NOT_MARKED") {
    return <span className="text-sm text-slate-300">—</span>;
  }
  if (!location) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold"
        style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.18)" }}>
        <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
          <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
        Not captured
      </span>
    );
  }
  const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const accuracyText = location.accuracy !== null ? `±${Math.round(location.accuracy)}m` : "";
  return (
    <a
      href={mapsUrl}
      rel="noopener noreferrer"
      target="_blank"
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold transition-opacity hover:opacity-75"
      style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.22)" }}
      title={`Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}${accuracyText ? ` (${accuracyText})` : ""}`}
    >
      <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
        <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="9" r="2.5" fill="currentColor" />
      </svg>
      View on Map
      {accuracyText && <span className="opacity-60 ml-0.5">{accuracyText}</span>}
    </a>
  );
}

const UNDO_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in ms


export function AttendancePanel({ data }: AttendancePanelProps) {
  const [workMode, setWorkMode] = useState<WorkMode>("OFFICE");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [checkInPending, startCheckIn] = useTransition();
  // Checkout confirmation state: false = default, true = waiting for confirm
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const [checkOutPending, startCheckOut] = useTransition();
  const [checkOutError, setCheckOutError] = useState<string | null>(null);
  // Undo state
  const [undoPending, startUndo] = useTransition();
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkedIn  = !!data.todayRecord?.checkInAt  && data.todayRecord.checkInAt  !== "Not marked";
  const checkedOut = !!data.todayRecord?.checkOutAt && data.todayRecord.checkOutAt !== "Not marked";

  async function handleCheckIn() {
    setGeoError(null);

    const fd = new FormData();
    fd.set("workMode", workMode);

    if (workMode === "OFFICE") {
      setGeoStatus("loading");

      let location: Awaited<ReturnType<typeof getBrowserLocation>>;

      try {
        location = await getBrowserLocation();
      } catch (error) {
        setGeoStatus("error");
        setGeoError(getLocationErrorMessage(error, "check-in"));
        return;
      }

      setGeoStatus("idle");
      fd.set("lat", String(location.lat));
      fd.set("lng", String(location.lng));
      fd.set("accuracy", String(location.accuracy));
    }

    startCheckIn(async () => {
      try {
        await checkInAttendance(fd);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Check-in fail ho gaya. Dobara try karein.";
        setGeoError(msg);
      }
    });
  }

  async function handleCheckOutConfirm() {
    setCheckOutError(null);
    setConfirmingCheckout(false);

    const fd = new FormData();
    const checkoutWorkMode = (data.todayRecord?.workMode ?? workMode) as WorkMode;

    if (checkoutWorkMode === "OFFICE") {
      setGeoStatus("loading");

      let location: Awaited<ReturnType<typeof getBrowserLocation>>;
      try {
        location = await getBrowserLocation();
      } catch (error) {
        setGeoStatus("error");
        setCheckOutError(getLocationErrorMessage(error, "check-out"));
        return;
      }

      setGeoStatus("idle");
      fd.set("lat", String(location.lat));
      fd.set("lng", String(location.lng));
      fd.set("accuracy", String(location.accuracy));
    }

    startCheckOut(async () => {
      try {
        await checkOutAttendance(fd);
        // Show undo button for 15 minutes
        setUndoVisible(true);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndoVisible(false), UNDO_WINDOW_MS);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Check-out fail ho gaya. Dobara try karein.";
        setCheckOutError(msg);
      }
    });
  }

  function handleUndoCheckout() {
    setUndoError(null);
    startUndo(async () => {
      try {
        await cancelCheckout();
        setUndoVisible(false);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Undo fail ho gaya.";
        setUndoError(msg);
      }
    });
  }

  const presentToday = data.todayRecords.filter((r) => r.status !== "NOT_MARKED").length;
  const absentToday  = data.todayRecords.filter((r) => r.status === "NOT_MARKED").length;
  const lateToday    = data.todayRecords.filter((r) => r.isLate).length;
  const wfhToday     = data.todayRecords.filter((r) => r.workMode === "WFH").length;

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

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

            {/* Worked hours strip — shows after checkout */}
            {data.todayRecord?.status === "COMPLETED" && data.todayRecord.workedMinutes > 0 && (
              <WorkedHoursStrip minutes={data.todayRecord.workedMinutes} />
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

            {/* Geo error */}
            {geoError && (
              <div className="mx-6 mt-3 flex items-start gap-2.5 rounded-xl px-4 py-2.5"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <span className="mt-0.5 shrink-0 text-base">📍</span>
                <p className="text-[0.68rem] font-semibold leading-relaxed text-rose-300">{geoError}</p>
              </div>
            )}

            {/* GPS acquiring indicator */}
            {geoStatus === "loading" && (
              <div className="mx-6 mt-3 flex items-center gap-2.5 rounded-xl px-4 py-2.5"
                style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.25)" }}>
                <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
                <p className="text-[0.68rem] font-semibold text-sky-300">Location detect ho rahi hai…</p>
              </div>
            )}

            {/* Check-out error */}
            {checkOutError && (
              <div className="mx-6 mt-3 flex items-start gap-2.5 rounded-xl px-4 py-2.5"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <span className="mt-0.5 shrink-0 text-base">⚠️</span>
                <p className="text-[0.68rem] font-semibold leading-relaxed text-rose-300">{checkOutError}</p>
              </div>
            )}

            {/* Undo checkout banner — visible 15 min after checkout */}
            {undoVisible && (
              <div className="mx-6 mt-3 rounded-xl px-4 py-3"
                style={{ background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <p className="text-[0.68rem] font-bold text-amber-300">Galti se check-out ho gaya?</p>
                {undoError && <p className="mt-1 text-[0.65rem] text-rose-300">{undoError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={undoPending}
                    onClick={handleUndoCheckout}
                    className="rounded-lg px-3 py-1.5 text-[0.68rem] font-bold transition-all disabled:opacity-50"
                    style={{ background: "rgba(245,158,11,0.3)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.4)" }}
                  >
                    {undoPending ? "Undo ho raha hai…" : "↩ Checkout Undo Karo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUndoVisible(false)}
                    className="rounded-lg px-3 py-1.5 text-[0.68rem] font-semibold text-white/40 hover:text-white/60"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="mt-1.5 text-[0.6rem] text-white/30">Yeh option 15 minute tak available hai</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-5 space-y-3 px-6 pb-6">
              {/* Check-in button — full width */}
              <button
                type="button"
                disabled={checkInPending || geoStatus === "loading"}
                onClick={handleCheckIn}
                className="w-full rounded-xl py-3.5 text-sm font-bold shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#10b981,#0d9488)", color: "#fff", border: "none" }}
              >
                {checkInPending || geoStatus === "loading" ? "📍 Locating…" : "↗ Check In"}
              </button>

              {/* Check-out: 2-step confirmation */}
              {!confirmingCheckout ? (
                <button
                  type="button"
                  disabled={checkOutPending}
                  onClick={() => { setCheckOutError(null); setConfirmingCheckout(true); }}
                  className="w-full rounded-xl py-3.5 text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)", color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(59,130,246,0.35)" }}
                >
                  ↙ Check Out
                </button>
              ) : (
                <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.1)" }}>
                  <p className="px-4 pt-3 text-[0.7rem] font-bold text-amber-300">
                    ⚠️ Kya aap sure hain? Check out karna chahte hain?
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    <button
                      type="button"
                      disabled={checkOutPending}
                      onClick={handleCheckOutConfirm}
                      className="rounded-lg py-2.5 text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#3b82f6,#0ea5e9)", color: "#fff" }}
                    >
                      {checkOutPending ? "Checking out…" : "✓ Haan, Check Out"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCheckout(false)}
                      className="rounded-lg py-2.5 text-xs font-bold text-white/60 hover:text-white/80 transition-colors"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
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
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Hours</th>
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Mode</th>
                    <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Status</th>
                    {data.canViewLocation && (
                      <th className="px-4 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">Location</th>
                    )}
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
                        <AttendanceTimeCell datetime={record.checkInAt} />
                        {record.isLate && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                            ⏱ Late +{record.lateByMinutes}m
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <AttendanceTimeCell datetime={record.checkOutAt} dimmed />
                      </td>
                      <td className="px-4 py-4">
                        <HoursCell minutes={record.workedMinutes} status={record.status} />
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
                      {data.canViewLocation && (
                        <td className="px-4 py-4">
                          <LocationCell location={record.checkInLocation ?? null} status={record.status} />
                        </td>
                      )}
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
                    <span className="min-w-10 text-sm font-bold" style={{ color: barColor }}>
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

  const parts = time ? time.split(" · ") : [];
  const datePart = parts[0] ?? null;
  const timePart = parts[1] ?? null;

  return (
    <div className="rounded-xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.24em]" style={{ color: accentColor }}>{label}</p>
      {time && timePart ? (
        <>
          <p className="mt-1.5 text-base font-bold uppercase" style={{ color: textColor }}>
            {timePart}
          </p>
          <p className="mt-0.5 text-[0.62rem] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            {datePart}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-base font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>
          Not marked
        </p>
      )}
    </div>
  );
}

function StatCard({ gradient, iconBg, icon, label, value }: {
  gradient: string; iconBg: string; icon: string; label: string; value: number;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}
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
