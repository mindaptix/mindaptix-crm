"use client";

import { useActionState, useEffect } from "react";
import { addPaymentInstallment } from "../actions";
import type { ClientPaymentEntry } from "../types";
import { ACTION_STYLES, formatCurrency } from "../presentation";

export function RecordInstallmentForm({ payment, onClose }: { payment: ClientPaymentEntry; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(addPaymentInstallment, {});
  useEffect(() => { if (state.success) onClose(); }, [state.success, onClose]);
  const today = new Date().toISOString().slice(0, 10);
  const remaining = payment.balanceDue;

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500">
          <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-900">Record Installment</p>
          <p className="text-[0.62rem] text-emerald-600">Remaining: {formatCurrency(remaining)}</p>
        </div>
      </div>
      <input name="paymentId" type="hidden" value={payment.id} />
      {state.error ? <p className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-wide text-emerald-700">Amount (₹) *</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600">₹</span>
            <input
              className="w-full rounded-md border border-emerald-200 bg-white py-2.5 pl-7 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
          <label className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-wide text-emerald-700">Date Received</label>
          <input
            className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            defaultValue={today}
            name="txDate"
            type="date"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-wide text-emerald-700">Note / Reference</label>
        <input
          className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          name="note"
          placeholder="e.g. NEFT transfer, cheque no."
        />
      </div>
      <div className="flex gap-2">
        <button
          className={ACTION_STYLES.receive}
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save Installment"}
        </button>
        <button
          className={ACTION_STYLES.neutral}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
