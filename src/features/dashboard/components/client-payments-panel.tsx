"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { ClientPaymentEntry, PaymentsPageData } from "@/features/dashboard/types";
import {
  addPaymentInstallment,
  createClientPayment,
  deleteClientPayment,
  updateClientPayment,
  type ClientPaymentFormState,
} from "@/features/dashboard/actions/client-payments";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  PENDING:  { label: "Pending",    bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", dot: "#3b82f6" },
  PARTIAL:  { label: "Partial",    bg: "#fffbeb", text: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
  PAID:     { label: "Paid",       bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7", dot: "#10b981" },
  OVERDUE:  { label: "Overdue",    bg: "#fff1f2", text: "#be123c", border: "#fca5a5", dot: "#ef4444" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: `${color}12`, border: `1px solid ${color}22`, boxShadow: `0 2px 14px ${color}10` }}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10" style={{ background: color }} />
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em]" style={{ color }}>{label}</p>
      <p className="mt-2 text-[1.9rem] font-black leading-none tracking-tight" style={{ color }}>{value}</p>
      {sub ? <p className="mt-2 text-[0.68rem] leading-4 text-slate-500">{sub}</p> : null}
    </div>
  );
}

// ─── ComboField — input + portal dropdown ────────────────────────────────────

function ComboField({
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
      <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}{required ? <span className="ml-0.5 text-amber-500">*</span> : ""}
      </label>
      <input name={name} type="hidden" value={value} />
      <div className="relative">
        <input
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
          onBlur={() => {}}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          ref={inputRef}
          required={required}
          value={search}
        />
        <button
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-amber-500"
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
          className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: "13rem", overflowY: "auto" }}
        >
          <div className="border-b border-slate-100 bg-amber-50/60 px-4 py-2">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-amber-700">Select or type</p>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400 italic">No matches — using custom value</p>
          ) : (
            filtered.map((opt) => (
              <button
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-amber-50 ${opt === value ? "bg-amber-50 font-semibold text-amber-800" : "text-slate-700"}`}
                key={opt}
                onPointerDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                type="button"
              >
                {opt}
                {opt === value ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[0.55rem] font-black">✓</span>
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

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "linear-gradient(135deg,#92400e,#d97706)" }}>
        <span className="text-white">{icon}</span>
      </span>
      <span className="text-[0.65rem] font-black uppercase tracking-[0.26em] text-amber-800">{label}</span>
      <span className="h-px flex-1" style={{ background: "linear-gradient(90deg,#fcd34d,transparent)" }} />
    </div>
  );
}

// ─── Currency input ───────────────────────────────────────────────────────────

function CurrencyInput({ label, name, defaultValue, placeholder, required }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}{required ? <span className="ml-0.5 text-amber-500">*</span> : ""}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.7rem] font-black text-amber-700">₹</span>
        </div>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
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

// ─── Status picker (premium cards) ─────────────────────────────────────────

const STATUS_OPTIONS: {
  value: string; label: string; desc: string;
  color: string; bg: string; border: string; dot: string; activeBg: string;
}[] = [
  { value: "PENDING",  label: "Pending",  desc: "Awaiting payment",   color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", activeBg: "#dbeafe" },
  { value: "PARTIAL",  label: "Partial",  desc: "Part received",      color: "#78350f", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", activeBg: "#fef3c7" },
  { value: "PAID",     label: "Paid",     desc: "Fully collected",    color: "#064e3b", bg: "#ecfdf5", border: "#6ee7b7", dot: "#10b981", activeBg: "#d1fae5" },
  { value: "OVERDUE",  label: "Overdue",  desc: "Past due date",      color: "#9f1239", bg: "#fff1f2", border: "#fca5a5", dot: "#ef4444", activeBg: "#fee2e2" },
];

function StatusPicker({ defaultValue }: { defaultValue?: string }) {
  const [selected, setSelected] = useState(defaultValue ?? "PENDING");
  return (
    <div className="sm:col-span-2">
      <label className="mb-2 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">Payment Status</label>
      <input name="status" type="hidden" value={selected} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_OPTIONS.map((s) => {
          const active = selected === s.value;
          return (
            <button
              className="flex flex-col items-start rounded-xl border p-3 text-left transition-all"
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
              <span className="text-[0.72rem] font-black">{s.label}</span>
              <span className="mt-0.5 text-[0.6rem] font-medium opacity-70">{s.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recurring toggle section ────────────────────────────────────────────────

function RecurringSection({ defaultEnabled, defaultDay, defaultEndDate }: {
  defaultEnabled?: boolean;
  defaultDay?: number | null;
  defaultEndDate?: string;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled ?? false);
  return (
    <div className="rounded-2xl border border-violet-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
            style={{ background: enabled ? "linear-gradient(135deg,#6d28d9,#8b5cf6)" : "#e2e8f0" }}>
            <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="white" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </span>
          <div>
            <p className="text-[0.72rem] font-black text-slate-800">Recurring Payment</p>
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
            <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-violet-600">
              Billing Day of Month <span className="text-amber-500">*</span>
            </label>
            <input
              className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
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
            <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-violet-600">
              End Date <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <input
              className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
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

// ─── Payment modal (premium) ──────────────────────────────────────────────────

function PaymentModal({
  initial,
  onSuccess,
  onClose,
  suggestions,
}: {
  initial?: ClientPaymentEntry;
  onSuccess: () => void;
  onClose: () => void;
  suggestions: { clientName: string; projectName: string }[];
}) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit ? updateClientPayment : createClientPayment;
  const [state, formAction, pending] = useActionState<ClientPaymentFormState, FormData>(action, {
    values: initial
      ? {
          id: initial.id,
          clientName: initial.clientName,
          projectName: initial.projectName,
          invoiceNumber: initial.invoiceNumber,
          amount: String(initial.totalAmount),
          receivedAmount: String(initial.receivedAmount),
          dueDate: initial.dueDate,
          receivedDate: initial.receivedDate,
          status: initial.status,
          note: initial.note,
          isRecurring: String(initial.isRecurring ?? false),
          recurringDayOfMonth: initial.recurringDayOfMonth ? String(initial.recurringDayOfMonth) : "",
          recurringEndDate: initial.recurringEndDate ?? "",
        }
      : {},
  });

  const v = state.values ?? {};
  const [clientName, setClientName] = useState(v.clientName ?? initial?.clientName ?? "");
  const [projectName, setProjectName] = useState(v.projectName ?? initial?.projectName ?? "");

  useEffect(() => {
    if (v.clientName !== undefined) setClientName(v.clientName);
    if (v.projectName !== undefined) setProjectName(v.projectName);
  }, [v.clientName, v.projectName]);

  useEffect(() => { if (state.success) onSuccess(); }, [state.success, onSuccess]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clientNames = useMemo(
    () => Array.from(new Set(suggestions.map((s) => s.clientName).filter(Boolean))).sort(),
    [suggestions],
  );
  const allProjectNames = useMemo(
    () => Array.from(new Set(suggestions.map((s) => s.projectName).filter(Boolean))).sort(),
    [suggestions],
  );

  function handleProjectChange(value: string) {
    setProjectName(value);
    const match = suggestions.find((s) => s.projectName === value);
    if (match?.clientName) setClientName(match.clientName);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(2,6,23,0.62)", backdropFilter: "blur(6px)" }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal card */}
      <div
        className="relative z-10 flex w-full max-w-[920px] flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]"
        style={{
          background: "#fff",
          boxShadow: "0 32px 80px rgba(2,6,23,0.28), 0 0 0 1px rgba(245,158,11,0.12)",
          maxHeight: "96dvh",
          minHeight: "min(700px, 96dvh)",
        }}
      >
        {/* ── Modal header ── */}
        <div
          className="relative shrink-0 overflow-hidden px-7 pb-6 pt-7"
          style={{
            background: "linear-gradient(135deg,#78350f 0%,#b45309 40%,#d97706 72%,#fbbf24 100%)",
          }}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-20" style={{ background: "#fef3c7" }} />
          <div className="pointer-events-none absolute -bottom-6 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full opacity-10 blur-2xl" style={{ background: "#fbbf24" }} />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.32em] text-amber-200">
                {isEdit ? "Edit Record" : "New Record"} · Payment Pipeline
              </p>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-white">
                {isEdit ? "Update Payment" : "Add Payment Record"}
              </h2>
              <p className="mt-1 text-sm text-amber-100/80">
                {isEdit ? "Modify invoice details and payment status." : "Fill in client & invoice details to track this payment."}
              </p>
            </div>
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              onClick={onClose}
              type="button"
            >
              <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
            </button>
          </div>

          {/* Invoice icon strip */}
          <div className="relative mt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="2" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white/90">Secure Finance Record</p>
              <p className="text-[0.62rem] text-amber-200/70">All amounts in Indian Rupees (₹)</p>
            </div>
          </div>
        </div>

        {/* ── Modal body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ background: "linear-gradient(180deg,#fafaf9 0%,#f8fafc 100%)" }}>
          <form action={formAction} id="payment-modal-form" className="space-y-3 px-6 py-5">
            {isEdit && <input name="paymentId" type="hidden" value={v.id ?? initial?.id ?? ""} />}

            {state.error ? (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                    <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-700">{state.error}</p>
              </div>
            ) : null}

            {/* Section 1 — Client Info */}
            <div className="rounded-2xl border border-amber-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.06)]">
              <div className="mb-3">
                <SectionLabel
                  icon={<svg fill="none" height="12" viewBox="0 0 24 24" width="12"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2.5" /></svg>}
                  label="Client Information"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ComboField
                  label="Client Name"
                  name="clientName"
                  onChange={setClientName}
                  options={clientNames}
                  placeholder="Type or select client…"
                  required
                  value={clientName}
                />
                <ComboField
                  label="Project Name"
                  name="projectName"
                  onChange={handleProjectChange}
                  options={allProjectNames}
                  placeholder="Type or select project…"
                  required
                  value={projectName}
                />
              </div>
            </div>

            {/* Section 2 — Invoice + Status */}
            <div className="rounded-2xl border border-amber-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.06)]">
              <div className="mb-3">
                <SectionLabel
                  icon={<svg fill="none" height="12" viewBox="0 0 24 24" width="12"><rect height="18" rx="2" width="14" x="5" y="3" stroke="currentColor" strokeWidth="2.5" /><path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>}
                  label="Invoice Details"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">Invoice Number</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  defaultValue={v.invoiceNumber ?? ""}
                  name="invoiceNumber"
                  placeholder="e.g. INV-2025-001"
                />
              </div>
              <StatusPicker defaultValue={v.status ?? initial?.status} />
            </div>

            {/* Section 3 — Financials */}
            <div className="rounded-2xl border border-amber-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.06)]">
              <div className="mb-3">
                <SectionLabel
                  icon={<svg fill="none" height="12" viewBox="0 0 24 24" width="12"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" /></svg>}
                  label="Financial Details"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CurrencyInput
                  defaultValue={v.amount && v.amount !== "0" ? v.amount : initial?.totalAmount ? String(initial.totalAmount) : ""}
                  label="Total Invoice Amount"
                  name="amount"
                  placeholder="e.g. 1,50,000"
                  required
                />
                <CurrencyInput
                  defaultValue={v.receivedAmount && v.receivedAmount !== "0" ? v.receivedAmount : initial?.receivedAmount ? String(initial.receivedAmount) : ""}
                  label="Amount Received"
                  name="receivedAmount"
                  placeholder="e.g. 75,000"
                />
              </div>
            </div>

            {/* Section 4 — Timeline */}
            <div className="rounded-2xl border border-amber-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.06)]">
              <div className="mb-3">
                <SectionLabel
                  icon={<svg fill="none" height="12" viewBox="0 0 24 24" width="12"><rect height="18" rx="2" width="18" x="3" y="4" stroke="currentColor" strokeWidth="2.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>}
                  label="Payment Timeline"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">Due Date</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    defaultValue={v.dueDate ?? initial?.dueDate ?? ""}
                    name="dueDate"
                    type="date"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">Date Received</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    defaultValue={v.receivedDate ?? initial?.receivedDate ?? ""}
                    name="receivedDate"
                    type="date"
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="rounded-2xl border border-amber-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(245,158,11,0.06)]">
              <label className="mb-2 block text-[0.67rem] font-bold uppercase tracking-[0.18em] text-slate-500">Internal Note <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
              <textarea
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                defaultValue={v.note ?? initial?.note ?? ""}
                name="note"
                placeholder="Any additional context, payment terms, or follow-up notes…"
                rows={2}
              />
            </div>

            {/* Recurring — only for new payments */}
            {!isEdit ? (
              <RecurringSection
                defaultEnabled={v.isRecurring === "true"}
                defaultDay={v.recurringDayOfMonth ? Number(v.recurringDayOfMonth) : null}
                defaultEndDate={v.recurringEndDate ?? ""}
              />
            ) : null}
          </form>
        </div>

        {/* ── Modal footer ── */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-7 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.65rem] text-slate-400">
              {isEdit ? "Changes will update the existing record." : "Record will be saved to Payment Pipeline."}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
                disabled={pending}
                form="payment-modal-form"
                style={{
                  background: pending
                    ? "#d97706"
                    : "linear-gradient(135deg,#b45309 0%,#d97706 60%,#f59e0b 100%)",
                  boxShadow: pending ? "none" : "0 4px 16px rgba(245,158,11,0.35)",
                }}
                type="submit"
              >
                {pending ? (
                  <>
                    <svg className="animate-spin" fill="none" height="14" viewBox="0 0 24 24" width="14">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="white" strokeLinecap="round" strokeWidth="4" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="2" />
                      <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    {isEdit ? "Update Record" : "Save Payment"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Record installment form ─────────────────────────────────────────────────

function RecordInstallmentForm({ payment, onClose }: { payment: ClientPaymentEntry; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(addPaymentInstallment, {});
  useEffect(() => { if (state.success) onClose(); }, [state.success, onClose]);
  const today = new Date().toISOString().slice(0, 10);
  const remaining = payment.balanceDue;

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500">
          <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-black text-emerald-900">Record Installment</p>
          <p className="text-[0.62rem] text-emerald-600">Remaining: {formatCurrency(remaining)}</p>
        </div>
      </div>
      <input name="paymentId" type="hidden" value={payment.id} />
      {state.error ? <p className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-emerald-700">Amount (₹) *</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600">₹</span>
            <input
              className="w-full rounded-xl border border-emerald-200 bg-white py-2.5 pl-7 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              max={remaining}
              min={1}
              name="txAmount"
              placeholder="e.g. 50000"
              required
              type="number"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-emerald-700">Date Received</label>
          <input
            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            defaultValue={today}
            name="txDate"
            type="date"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-emerald-700">Note / Reference</label>
        <input
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          name="note"
          placeholder="e.g. NEFT transfer, cheque no."
        />
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save Installment"}
        </button>
        <button
          className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Payment card ────────────────────────────────────────────────────────────

function PaymentCard({
  payment,
  canManage,
  onEdit,
}: {
  payment: ClientPaymentEntry;
  canManage: boolean;
  onEdit: (p: ClientPaymentEntry) => void;
}) {
  const [showInstallment, setShowInstallment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOverdue = payment.status === "OVERDUE";
  const isPaid = payment.status === "PAID";
  const pct = payment.totalAmount > 0
    ? Math.min(Math.round((payment.receivedAmount / payment.totalAmount) * 100), 100)
    : 0;
  const txCount = payment.transactions?.length ?? 0;

  return (
    <article
      className="overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        border: isOverdue ? "1px solid #fca5a5" : "1px solid #e2e8f0",
        borderTop: `3px solid ${STATUS_CFG[payment.status]?.dot ?? "#3b82f6"}`,
        boxShadow: isOverdue ? "0 4px 18px rgba(239,68,68,0.08)" : "0 4px 14px rgba(15,23,42,0.05)",
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-[0.95rem] font-bold text-slate-900">{payment.clientName || "Unknown Client"}</h3>
              {payment.isRecurring ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide text-violet-700">
                  <svg fill="none" height="8" viewBox="0 0 24 24" width="8"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"/></svg>
                  Recurring
                </span>
              ) : null}
              {payment.recurringParentId ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide text-sky-700">
                  <svg fill="none" height="8" viewBox="0 0 24 24" width="8"><rect height="18" rx="2" width="14" x="5" y="3" stroke="currentColor" strokeWidth="2.5"/><path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/></svg>
                  Monthly
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[0.72rem] text-slate-500">{payment.projectName || "—"}</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>
        {payment.invoiceNumber ? (
          <p className="mt-1.5 text-[0.65rem] font-semibold tracking-wider text-slate-400">INV: {payment.invoiceNumber}</p>
        ) : null}
        {payment.isRecurring && payment.recurringDayOfMonth ? (
          <p className="mt-1 flex items-center gap-1 text-[0.63rem] font-semibold text-violet-600">
            <svg fill="none" height="9" viewBox="0 0 24 24" width="9"><rect height="18" rx="2" width="18" x="3" y="4" stroke="currentColor" strokeWidth="2.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/></svg>
            Renews on {payment.recurringDayOfMonth}{["st","nd","rd"][((payment.recurringDayOfMonth + 90) % 100 - 10) % 10 - 1] ?? "th"} of every month
            {payment.recurringEndDate ? ` · until ${payment.recurringEndDate}` : ""}
          </p>
        ) : null}
      </div>

      {/* ── Amount + Progress ── */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">Contract Value</span>
          <span className="text-sm font-black text-slate-900">{formatCurrency(payment.totalAmount)}</span>
        </div>

        {/* Progress bar with percentage */}
        <div className="relative">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isPaid ? "#10b981" : pct > 0 ? "linear-gradient(90deg,#f59e0b,#10b981)" : "#e2e8f0",
              }}
            />
          </div>
          <span className="absolute right-0 top-4 text-[0.58rem] font-bold text-slate-400">{pct}%</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-50 px-3 py-2">
            <p className="text-[0.6rem] font-bold uppercase tracking-wide text-emerald-600">Received</p>
            <p className="mt-0.5 text-[0.88rem] font-black text-emerald-700">{formatCurrency(payment.receivedAmount)}</p>
          </div>
          <div className={`rounded-xl px-3 py-2 ${isOverdue ? "bg-red-50" : "bg-amber-50"}`}>
            <p className={`text-[0.6rem] font-bold uppercase tracking-wide ${isOverdue ? "text-red-500" : "text-amber-600"}`}>Balance Due</p>
            <p className={`mt-0.5 text-[0.88rem] font-black ${isOverdue ? "text-red-700" : "text-amber-700"}`}>
              {payment.balanceDue > 0 ? formatCurrency(payment.balanceDue) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Installment history ── */}
      {txCount > 0 ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowHistory((v) => !v)}
            type="button"
          >
            <span className="flex items-center gap-1.5 text-[0.68rem] font-bold text-slate-600">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[0.55rem] font-black text-slate-500">{txCount}</span>
              Installment{txCount !== 1 ? "s" : ""} received
            </span>
            <svg className={`transition-transform ${showHistory ? "rotate-180" : ""}`} fill="none" height="12" viewBox="0 0 24 24" width="12">
              <path d="m6 9 6 6 6-6" stroke="#94a3b8" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </button>

          {showHistory ? (
            <div className="mt-2 space-y-1.5">
              {payment.transactions.slice().reverse().map((tx, i) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  key={tx.id || i}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <svg fill="none" height="9" viewBox="0 0 24 24" width="9">
                        <path d="M20 12H4M12 4l8 8-8 8" stroke="#10b981" strokeLinecap="round" strokeWidth="2.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[0.68rem] font-bold text-slate-800">{formatCurrency(tx.txAmount)}</p>
                      {tx.note ? <p className="text-[0.6rem] text-slate-400">{tx.note}</p> : null}
                    </div>
                  </div>
                  <span className="text-[0.6rem] font-semibold text-slate-400">{tx.txDate || tx.createdAt}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Dates + note ── */}
      {(payment.dueDate || payment.receivedDate) ? (
        <div className="border-t border-slate-100 px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
          {payment.dueDate ? (
            <span className={`text-[0.62rem] font-semibold ${isOverdue ? "text-red-600" : "text-slate-400"}`}>Due: {payment.dueDate}</span>
          ) : null}
          {payment.receivedDate ? (
            <span className="text-[0.62rem] font-semibold text-emerald-600">Last payment: {payment.receivedDate}</span>
          ) : null}
        </div>
      ) : null}

      {payment.note ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[0.68rem] leading-4 text-slate-500 line-clamp-2">{payment.note}</p>
        </div>
      ) : null}

      {/* ── Installment form ── */}
      {showInstallment && !isPaid ? (
        <div className="px-4 pb-3">
          <RecordInstallmentForm payment={payment} onClose={() => setShowInstallment(false)} />
        </div>
      ) : null}

      {/* ── Actions ── */}
      {canManage ? (
        <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
          {!isPaid && !showInstallment ? (
            <button
              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.68rem] font-bold text-emerald-700 hover:bg-emerald-100 transition"
              onClick={() => setShowInstallment(true)}
              type="button"
            >
              <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
              Record Payment
            </button>
          ) : null}
          <button
            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[0.68rem] font-bold text-blue-700 hover:bg-blue-100 transition"
            onClick={() => onEdit(payment)}
            type="button"
          >
            Edit
          </button>
          {confirmDelete ? (
            <form action={deleteClientPayment} className="flex gap-2" onSubmit={() => setConfirmDelete(false)}>
              <input name="paymentId" type="hidden" value={payment.id} />
              <button className="rounded-lg bg-red-600 px-3 py-1.5 text-[0.68rem] font-bold text-white hover:bg-red-700 transition" type="submit">Confirm Delete</button>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold text-slate-500 hover:bg-slate-50 transition" onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
            </form>
          ) : (
            <button
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[0.68rem] font-bold text-red-700 hover:bg-red-100 transition"
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              Delete
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

const FILTERS = ["ALL", "PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;
type Filter = (typeof FILTERS)[number];

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ClientPaymentsPanel({ data, inline }: { data: PaymentsPageData; inline?: boolean }) {
  const router = useRouter();
  const suggestions = data.projectSuggestions ?? [];
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");
  const [editTarget, setEditTarget] = useState<ClientPaymentEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = data.payments.filter((p) => activeFilter === "ALL" || p.status === activeFilter);

  const filterCounts: Record<Filter, number> = {
    ALL: data.payments.length,
    PENDING: data.pendingCount,
    PARTIAL: data.partialCount,
    PAID: data.paidCount,
    OVERDUE: data.overdueCount,
  };

  function openCreate() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(p: ClientPaymentEntry) {
    setEditTarget(p);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-5 px-3 pb-3 pt-2 sm:px-7 sm:pb-6">

      {/* ── Page header ── */}
      <div className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_30%),linear-gradient(180deg,#fffbeb_0%,#ffffff_45%,#f8fafc_100%)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/75 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {!inline ? (
                <button
                  className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-slate-500 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => router.back()}
                  type="button"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                    <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                      <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                    </svg>
                  </span>
                  Back
                </button>
              ) : null}
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">Finance Module</p>
              <h2 className="mt-1.5 text-[1.6rem] font-black tracking-tight text-slate-950">Payment Pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">Track all client invoices, received amounts, and overdue payments.</p>
            </div>
            {data.canManage ? (
              <button
                className="rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)] hover:bg-amber-600 transition"
                onClick={openCreate}
                type="button"
              >
                + Add Payment Record
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Collected"
          value={formatCurrency(data.totalCollected)}
          sub={`${data.paidCount} fully paid · ${data.partialCount} partial`}
          color="#10b981"
        />
        <StatCard
          label="Balance Due"
          value={formatCurrency(data.totalBalance)}
          sub="Across all active records"
          color="#3b82f6"
        />
        <StatCard
          label="Pending Amount"
          value={formatCurrency(data.totalPending)}
          sub={`${data.pendingCount} awaiting first payment`}
          color="#f59e0b"
        />
        <StatCard
          label="Overdue"
          value={String(data.overdueCount)}
          sub={data.overdueCount > 0 ? `${formatCurrency(data.totalOverdue)} outstanding` : "All on track"}
          color={data.overdueCount > 0 ? "#ef4444" : "#64748b"}
        />
      </div>

      {/* ── Overdue alert ── */}
      {data.overdueCount > 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-red-900">
              {data.overdueCount} payment{data.overdueCount !== 1 ? "s are" : " is"} overdue
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              Outstanding: {formatCurrency(data.totalOverdue)} — Follow up with clients immediately.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Payment modal ── */}
      {showForm && data.canManage ? (
        <PaymentModal
          initial={editTarget ?? undefined}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSuccess={handleFormSuccess}
          suggestions={suggestions}
        />
      ) : null}

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = filterCounts[f];
          const isActive = f === activeFilter;
          const dot = f === "ALL" ? "#64748b" : STATUS_CFG[f]?.dot ?? "#64748b";
          return (
            <button
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              key={f}
              onClick={() => setActiveFilter(f)}
              type="button"
            >
              {!isActive ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
              {f === "ALL" ? "All" : STATUS_CFG[f]?.label ?? f}
              <span className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Payment cards grid ── */}
      {filtered.length === 0 ? (
        <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm font-semibold text-slate-400">
            {data.payments.length === 0
              ? "No payment records yet. Click \"Add Payment Record\" to get started."
              : `No ${activeFilter.toLowerCase()} payments found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((payment) => (
            <PaymentCard
              canManage={data.canManage}
              key={payment.id}
              onEdit={openEdit}
              payment={payment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
