

// Shared action colors keep the same meaning across cards and forms.
const ACTION_BASE = "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const ACTION_STYLES = {
  primary: `${ACTION_BASE} border-blue-700 bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-600`,
  receive: `${ACTION_BASE} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-600`,
  edit: `${ACTION_BASE} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-600`,
  danger: `${ACTION_BASE} border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600`,
  confirmDelete: `${ACTION_BASE} border-red-700 bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600`,
  neutral: `${ACTION_BASE} border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500`,
};

// ─── helpers ────────────────────────────────────────────────────────────────

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  PENDING:  { label: "Pending",    bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", dot: "#3b82f6" },
  PARTIAL:  { label: "Partial",    bg: "#fffbeb", text: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
  PAID:     { label: "Paid",       bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7", dot: "#10b981" },
  OVERDUE:  { label: "Overdue",    bg: "#fff1f2", text: "#be123c", border: "#fca5a5", dot: "#ef4444" },
};
