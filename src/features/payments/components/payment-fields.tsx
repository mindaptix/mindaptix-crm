"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ComboField({
  label,
  name,
  onChange,
  options,
  placeholder,
  required,
  value,
}: {
  label: string;
  name: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  // Keep local search in sync when parent value changes (e.g. auto-fill)
  useEffect(() => { setSearch(value); }, [value]);

  // Reposition dropdown when it opens
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const t = e.target as Node;
      if (!inputRef.current?.contains(t) && !dropdownRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, search]);

  function handleInput(val: string) {
    setSearch(val);
    onChange(val);
    setOpen(true);
  }

  function handleSelect(val: string) {
    setSearch(val);
    onChange(val);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}{required ? <span className="ml-0.5 text-blue-500">*</span> : ""}
      </label>
      <input name={name} type="hidden" value={value} />
      <div className="relative">
        <input
          autoComplete="off"
          className="w-full rounded-md border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          ref={inputRef}
          required={required}
          value={search}
        />
        <button
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-blue-500"
          aria-label={`Show ${label.toLowerCase()} suggestions`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          tabIndex={-1}
          type="button"
        >
          <svg className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" height="15" viewBox="0 0 24 24" width="15">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
          </svg>
        </button>
      </div>
      {options.length > 0 && !search ? (
        <p className="mt-1 text-[0.63rem] font-medium text-slate-400">{options.length} suggestion{options.length !== 1 ? "s" : ""} available</p>
      ) : null}

      {open && typeof document !== "undefined" ? createPortal(
        <div
          className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-lg"
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: "13rem", overflowY: "auto" }}
        >
          <div className="border-b border-slate-100 bg-blue-50/60 px-4 py-2">
            <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-blue-700">Select or type</p>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400 italic">No matches — using custom value</p>
          ) : (
            filtered.map((opt) => (
              <button
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 ${opt === value ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-700"}`}
                key={opt}
                onPointerDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                type="button"
              >
                {opt}
                {opt === value ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[0.55rem] font-semibold">✓</span>
                ) : null}
              </button>
            ))
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────

export function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: "#475569" }}>
        <span className="text-white">{icon}</span>
      </span>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-700">{label}</span>
      <span className="h-px flex-1" style={{ background: "#e2e8f0" }} />
    </div>
  );
}

// ─── Currency input ───────────────────────────────────────────────────────────

export function CurrencyInput({ label, name, defaultValue, placeholder, required }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}{required ? <span className="ml-0.5 text-amber-500">*</span> : ""}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.7rem] font-semibold text-amber-700">₹</span>
        </div>
        <input
          className="w-full rounded-md border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          defaultValue={defaultValue ?? ""}
          min="0"
          name={name}
          placeholder={placeholder ?? "0"}
          required={required}
          type="number"
        />
      </div>
    </div>
  );
}

// ─── Status picker ─────────────────────────────────────────

const STATUS_OPTIONS: {
  value: string; label: string; desc: string;
  color: string; border: string; dot: string; activeBg: string;
}[] = [
  { value: "PENDING",  label: "Pending",  desc: "Awaiting payment",   color: "#1e40af", border: "#bfdbfe", dot: "#3b82f6", activeBg: "#dbeafe" },
  { value: "PARTIAL",  label: "Partial",  desc: "Part received",      color: "#78350f", border: "#fde68a", dot: "#f59e0b", activeBg: "#fef3c7" },
  { value: "PAID",     label: "Paid",     desc: "Fully collected",    color: "#064e3b", border: "#6ee7b7", dot: "#10b981", activeBg: "#d1fae5" },
  { value: "OVERDUE",  label: "Overdue",  desc: "Past due date",      color: "#9f1239", border: "#fca5a5", dot: "#ef4444", activeBg: "#fee2e2" },
];

export function StatusPicker({ defaultValue }: { defaultValue?: string }) {
  const [selected, setSelected] = useState(defaultValue ?? "PENDING");
  return (
    <div className="sm:col-span-2">
      <label className="mb-2 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">Payment Status</label>
      <input name="status" type="hidden" value={selected} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_OPTIONS.map((s) => {
          const active = selected === s.value;
          return (
            <button
              className="flex flex-col items-start rounded-md border p-3 text-left transition-all"
              key={s.value}
              onClick={() => setSelected(s.value)}
              style={active
                ? { background: s.activeBg, borderColor: s.dot, boxShadow: `0 0 0 2px ${s.border}, 0 4px 12px ${s.dot}22`, color: s.color }
                : { background: "#f8fafc", borderColor: "#e2e8f0", color: "#64748b" }
              }
              type="button"
            >
              <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg"
                style={{ background: active ? s.dot : "#e2e8f0" }}>
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
              <span className="text-[0.72rem] font-semibold">{s.label}</span>
              <span className="mt-0.5 text-[0.6rem] font-medium opacity-70">{s.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recurring toggle section ────────────────────────────────────────────────

export function RecurringSection({ defaultEnabled, defaultDay, defaultEndDate }: {
  defaultEnabled?: boolean;
  defaultDay?: number | null;
  defaultEndDate?: string;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled ?? false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ background: enabled ? "#7c3aed" : "#e2e8f0" }}>
            <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="white" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </span>
          <div>
            <p className="text-[0.72rem] font-semibold text-slate-800">Recurring Payment</p>
            <p className="text-[0.62rem] text-slate-500">Auto-generate every month on a fixed date</p>
          </div>
        </div>
        <button
          className="relative flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
          onClick={() => setEnabled((v) => !v)}
          style={{
            background: enabled ? "#8b5cf6" : "#e2e8f0",
            borderColor: enabled ? "#7c3aed" : "#d1d5db",
          }}
          type="button"
          aria-pressed={enabled}
        >
          <span
            className="absolute flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: enabled ? "translateX(1.35rem)" : "translateX(0.1rem)" }}
          />
        </button>
      </div>

      <input name="isRecurring" type="hidden" value={String(enabled)} />

      {enabled ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-violet-600">
              Billing Day of Month <span className="text-amber-500">*</span>
            </label>
            <input
              className="w-full rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              defaultValue={defaultDay ?? ""}
              max={28}
              min={1}
              name="recurringDayOfMonth"
              placeholder="e.g. 15 (15th of every month)"
              required={enabled}
              type="number"
            />
            <p className="mt-1 text-[0.62rem] text-slate-400">1–28 · Payment will auto-appear on this day each month</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-violet-600">
              End Date <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <input
              className="w-full rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              defaultValue={defaultEndDate ?? ""}
              name="recurringEndDate"
              type="date"
            />
            <p className="mt-1 text-[0.62rem] text-slate-400">Leave blank for indefinite recurring</p>
          </div>
        </div>
      ) : (
        <>
          <input name="recurringDayOfMonth" type="hidden" value="" />
          <input name="recurringEndDate" type="hidden" value="" />
        </>
      )}
    </div>
  );
}
