"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClientPayment, updateClientPayment } from "../actions";
import type { ClientPaymentEntry, ClientPaymentFormState } from "../types";
import { ACTION_STYLES } from "../presentation";
import { ComboField, SectionLabel, CurrencyInput, StatusPicker, RecurringSection } from "./payment-fields";

export function PaymentModal({
  initial,
  onSuccess,
  onClose,
  suggestions,
}: {
  initial?: ClientPaymentEntry;
  onSuccess: () => void;
  onClose: () => void;
  suggestions: { id: string; clientName: string; projectName: string }[];
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
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");

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
  function handleProjectChange(value: string) {
    setProjectId(value);
    const match = suggestions.find((s) => s.id === value);
    setProjectName(match?.projectName ?? "");
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
        className="relative z-10 flex w-full max-w-[920px] flex-col overflow-hidden rounded-t-xl sm:rounded-xl"
        style={{
          background: "#fff",
          boxShadow: "0 24px 64px rgba(15,23,42,0.2)",
          maxHeight: "96dvh",
          minHeight: "min(700px, 96dvh)",
        }}
      >
        {/* ── Modal header ── */}
        <div
          className="relative shrink-0 overflow-hidden px-7 pb-6 pt-7"
          style={{
            background: "#1e293b",
          }}
        >
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-300">
                {isEdit ? "Edit Record" : "New Record"} · Payment Pipeline
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
                {isEdit ? "Update Payment" : "Add Payment Record"}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {isEdit ? "Modify invoice details and payment status." : "Fill in client & invoice details to track this payment."}
              </p>
            </div>
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-500 bg-slate-700 text-white transition hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close payment form"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15 backdrop-blur">
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="2" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/90">Payment details</p>
              <p className="text-[0.62rem] text-slate-300">All amounts in Indian Rupees (₹)</p>
            </div>
          </div>
        </div>

        {/* ── Modal body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ background: "#f8fafc" }}>
          <form action={formAction} id="payment-modal-form" className="space-y-3 px-6 py-5">
            {isEdit && <input name="paymentId" type="hidden" value={v.id ?? initial?.id ?? ""} />}

            {state.error ? (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100">
                  <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                    <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-700">{state.error}</p>
              </div>
            ) : null}

            {/* Section 1 — Client Info */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
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
                <label className="text-xs font-medium text-slate-600">Project
                  <select name="projectId" required value={projectId} onChange={(event) => handleProjectChange(event.target.value)} className="crm-input mt-2">
                    <option value="">Select a project</option>
                    {suggestions.map((project) => <option key={project.id} value={project.id}>{project.projectName}{project.clientName ? ` — ${project.clientName}` : ""}</option>)}
                  </select>
                  <input type="hidden" name="projectName" value={projectName} />
                  {initial && !projectId && <span className="mt-1 block text-amber-700">This older payment needs a project link.</span>}
                </label>
              </div>
            </div>

            {/* Section 2 — Invoice + Status */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <SectionLabel
                  icon={<svg fill="none" height="12" viewBox="0 0 24 24" width="12"><rect height="18" rx="2" width="14" x="5" y="3" stroke="currentColor" strokeWidth="2.5" /><path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>}
                  label="Invoice Details"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">Invoice Number</label>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  defaultValue={v.invoiceNumber ?? ""}
                  name="invoiceNumber"
                  placeholder="e.g. INV-2025-001"
                />
              </div>
              <StatusPicker defaultValue={v.status ?? initial?.status} />
            </div>

            {/* Section 3 — Financials */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
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
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <SectionLabel
                  icon={<svg fill="none" height="12" viewBox="0 0 24 24" width="12"><rect height="18" rx="2" width="18" x="3" y="4" stroke="currentColor" strokeWidth="2.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>}
                  label="Payment Timeline"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
                  <input
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    defaultValue={v.dueDate ?? initial?.dueDate ?? ""}
                    name="dueDate"
                    type="date"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">Date Received</label>
                  <input
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    defaultValue={v.receivedDate ?? initial?.receivedDate ?? ""}
                    name="receivedDate"
                    type="date"
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <label className="mb-2 block text-[0.67rem] font-semibold uppercase tracking-wide text-slate-500">Internal Note <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
              <textarea
                className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.65rem] text-slate-400">
              {isEdit ? "Changes will update the existing record." : "Record will be saved to Payment Pipeline."}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                className={ACTION_STYLES.neutral}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className={ACTION_STYLES.primary}
                disabled={pending}
                form="payment-modal-form"
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
