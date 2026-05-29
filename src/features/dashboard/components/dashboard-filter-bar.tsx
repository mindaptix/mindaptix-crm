"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type DashboardFilterBarProps = {
  filterDate?: string;   // currently active YYYY-MM-DD
  filterLabel?: string;  // human-readable label from server ("Today" / "15 May 2026" / "May 2026")
  filterMonth?: string;  // currently active YYYY-MM
};

export function DashboardFilterBar({ filterDate, filterLabel, filterMonth }: DashboardFilterBarProps) {
  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const isFiltered = Boolean(filterDate || filterMonth);

  function applyDate(value: string) {
    if (!value) return;
    setLoading(true);
    router.push(`/dashboard?date=${value}`);
  }

  function applyMonth(value: string) {
    if (!value) return;
    setLoading(true);
    router.push(`/dashboard?month=${value}`);
  }

  function reset() {
    setLoading(true);
    if (dateRef.current) dateRef.current.value = "";
    if (monthRef.current) monthRef.current.value = "";
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {/* Active filter badge */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`h-2 w-2 shrink-0 rounded-full ${isFiltered ? "bg-blue-500" : "bg-emerald-400"}`} />
        <span className="text-xs font-semibold text-slate-700 truncate">
          {loading ? "Loading..." : isFiltered ? `Filtered: ${filterLabel}` : `Showing: ${filterLabel ?? "Today"}`}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {/* Date picker */}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          By Date
          <input
            className="sr-only"
            defaultValue={filterDate ?? ""}
            max={getTodayDate()}
            onChange={(e) => applyDate(e.target.value)}
            ref={dateRef}
            type="date"
          />
        </label>

        {/* Month picker */}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition-colors cursor-pointer">
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <line x1="8" x2="16" y1="15" y2="15" />
          </svg>
          By Month
          <input
            className="sr-only"
            defaultValue={filterMonth ?? ""}
            max={getTodayMonth()}
            onChange={(e) => applyMonth(e.target.value)}
            ref={monthRef}
            type="month"
          />
        </label>

        {/* Reset button — only shown when a filter is active */}
        {isFiltered ? (
          <button
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            onClick={reset}
            type="button"
          >
            <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="12">
              <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
            </svg>
            Clear Filter
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayMonth() {
  return new Date().toISOString().slice(0, 7);
}
