"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { generatePayslip, markPayslipPaid, setSalaryStructure } from "@/features/dashboard/actions/payroll";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import type { EmployeeOption, PayrollPageData, PayslipEntry, SalaryStructureEntry } from "@/features/dashboard/types";

type PayrollPanelProps = {
  canManage: boolean;
  data: PayrollPageData;
};

const SALARY_INITIAL = { error: undefined, success: undefined };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(amount);
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  return date.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function PayrollPanel({ data, canManage }: PayrollPanelProps) {
  const [activeTab, setActiveTab] = useState<"structures" | "payslips">("structures");
  const [selectedEmployee, setSelectedEmployee] = useState<SalaryStructureEntry | null>(null);
  const [showSetSalaryForm, setShowSetSalaryForm] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [selectedPayslipMonth, setSelectedPayslipMonth] = useState(data.availableMonthKeys[0] ?? data.selectedMonthKey);
  const [salaryState, salaryAction, salaryPending] = useActionState(setSalaryStructure, SALARY_INITIAL);
  const [payslipState, payslipAction, payslipPending] = useActionState(generatePayslip, SALARY_INITIAL);
  const [paidState, paidAction, paidPending] = useActionState(markPayslipPaid, SALARY_INITIAL);

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">HR Management</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Payroll</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage salary structures, generate monthly payslips, and track payments.
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
            {data.selectedMonthKey}
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.summaryCards.map((card) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={card.label}>
            <p className="text-xs font-medium text-slate-600">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <div className="flex w-full gap-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 sm:w-fit">
        {(["structures", "payslips"] as const).map((tab) => (
          <button
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === tab ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === "structures" ? "Salary Structures" : `Payslips (${data.selectedMonthKey})`}
          </button>
        ))}
      </div>

      {activeTab === "structures" ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <PanelHeader
            action={canManage ? (
              <Button className="sm:w-auto" onClick={() => { setSelectedEmployee(null); setShowSetSalaryForm(true); }}>
                Set Salary
              </Button>
            ) : null}
            eyebrow="Compensation"
            title="Salary Structures"
          />

          {showSetSalaryForm && canManage ? (
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6" key={selectedEmployee?.userId ?? "new"}>
              <form action={salaryAction} className="space-y-4">
                {salaryState.error ? <Feedback>{salaryState.error}</Feedback> : null}
                {salaryState.success ? <Feedback tone="success">{salaryState.success}</Feedback> : null}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedEmployee ? (
                    <div>
                      <p className="mb-1 block text-xs font-medium text-slate-700">Employee</p>
                      <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2">
                        <span className="text-sm font-semibold text-slate-900">{selectedEmployee.employeeName}</span>
                        <span className="text-xs text-slate-400">{selectedEmployee.employeeEmail}</span>
                      </div>
                      <input name="userId" type="hidden" value={selectedEmployee.userId} />
                    </div>
                  ) : (
                    <SelectField label="Employee" name="userId" options={data.employeeOptions} />
                  )}
                  <InputField defaultValue={selectedEmployee?.basicSalary ? selectedEmployee.basicSalary.toString() : ""} label="Basic Salary (INR)" name="basicSalary" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.hra ? selectedEmployee.hra.toString() : ""} label="HRA (INR)" name="hra" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.transportAllowance ? selectedEmployee.transportAllowance.toString() : ""} label="Transport Allowance (INR)" name="transportAllowance" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.medicalAllowance ? selectedEmployee.medicalAllowance.toString() : ""} label="Medical Allowance (INR)" name="medicalAllowance" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.otherAllowances ? selectedEmployee.otherAllowances.toString() : ""} label="Other Allowances (INR)" name="otherAllowances" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.tds ? selectedEmployee.tds.toString() : ""} label="TDS (INR)" name="tds" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.providentFund ? selectedEmployee.providentFund.toString() : ""} label="Provident Fund (INR)" name="providentFund" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.otherDeductions ? selectedEmployee.otherDeductions.toString() : ""} label="Other Deductions (INR)" name="otherDeductions" placeholder="0" type="number" />
                  <InputField defaultValue={selectedEmployee?.effectiveFrom ?? ""} label="Effective From" name="effectiveFrom" placeholder="" type="date" />
                </div>
                <TextAreaField label="Note (optional)" name="note" placeholder="Reason for revision" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="sm:w-auto" disabled={salaryPending} type="submit">
                    {salaryPending ? "Saving..." : "Save Salary Structure"}
                  </Button>
                  <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto" onClick={() => { setShowSetSalaryForm(false); setSelectedEmployee(null); }} type="button">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Employee", "Basic", "HRA", "Gross", "Deductions", "Net", "Effective From", "Status", ""].map((heading) => (
                    <th className="px-4 py-3 text-left font-medium" key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.salaryStructures.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-slate-400" colSpan={9}>No salary structures set yet.</td></tr>
                ) : (
                  data.salaryStructures.map((row) => (
                    <tr className="hover:bg-slate-50" key={row.userId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.employeeName}</p>
                        <p className="text-xs text-slate-400">{row.employeeEmail}</p>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(row.basicSalary)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.hra)}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(row.grossSalary)}</td>
                      <td className="px-4 py-3 text-red-600">{formatCurrency(row.tds + row.providentFund + row.otherDeductions)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(row.netSalary)}</td>
                      <td className="px-4 py-3 text-slate-500">{row.effectiveFrom || "-"}</td>
                      <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <button className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100" onClick={() => { setSelectedEmployee(row); setShowSetSalaryForm(true); }} type="button">
                            Edit
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "payslips" ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <PanelHeader
            action={canManage ? <Button className="sm:w-auto" onClick={() => setShowGenerateForm((value) => !value)}>Generate Payslip</Button> : null}
            eyebrow="Monthly Payroll"
            title="Payslips"
          />

          {/* Month tabs — last 3 months */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-5 py-2.5">
            {data.availableMonthKeys.map((mk) => (
              <button
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition ${selectedPayslipMonth === mk ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100" : "text-slate-500 hover:text-slate-700"}`}
                key={mk}
                onClick={() => { setSelectedPayslipMonth(mk); setShowGenerateForm(false); }}
                type="button"
              >
                {formatMonthLabel(mk)}
              </button>
            ))}
          </div>

          {showGenerateForm && canManage ? (
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <form action={payslipAction} className="space-y-4">
                {payslipState.error ? <Feedback>{payslipState.error}</Feedback> : null}
                {payslipState.success ? <Feedback tone="success">{payslipState.success}</Feedback> : null}
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField label="Employee" name="userId" options={data.employeeOptions} />
                  <InputField defaultValue={selectedPayslipMonth} label="Month (YYYY-MM)" name="monthKey" placeholder="" type="month" />
                  <InputField defaultValue="26" label="Working Days" name="workingDays" placeholder="26" type="number" />
                </div>
                <TextAreaField label="Note (optional)" name="note" placeholder="Additional note for this payslip" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="sm:w-auto" disabled={payslipPending} type="submit">{payslipPending ? "Generating..." : "Generate"}</Button>
                  <Button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto" onClick={() => setShowGenerateForm(false)} type="button">Cancel</Button>
                </div>
              </form>
            </div>
          ) : null}

          {paidState.error ? <div className="px-6 py-2"><Feedback>{paidState.error}</Feedback></div> : null}
          {paidState.success ? <div className="px-6 py-2"><Feedback tone="success">{paidState.success}</Feedback></div> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Employee", "Gross", "Deductions", "Net", "Present Days", "Status", "Paid On", ""].map((heading) => (
                    <th className="px-4 py-3 text-left font-medium" key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const monthPayslips = data.payslips.filter((p) => p.monthKey === selectedPayslipMonth);
                  return monthPayslips.length === 0 ? (
                    <tr><td className="px-4 py-10 text-center text-slate-400" colSpan={8}>No payslips generated for {formatMonthLabel(selectedPayslipMonth)} yet.</td></tr>
                  ) : (
                    monthPayslips.map((slip) => (
                      <PayslipRow canManage={canManage} key={slip.id} paidAction={paidAction} paidPending={paidPending} slip={slip} />
                    ))
                  );
                })()}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PanelHeader({ action, eyebrow, title }: { action: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{eyebrow}</p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function PayslipRow({
  slip,
  canManage,
  paidAction,
  paidPending,
}: {
  canManage: boolean;
  paidAction: (formData: FormData) => void;
  paidPending: boolean;
  slip: PayslipEntry;
}) {
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900">{slip.employeeName}</p>
        <p className="text-xs text-slate-400">{slip.employeeEmail}</p>
      </td>
      <td className="px-4 py-3">{formatCurrency(slip.grossSalary)}</td>
      <td className="px-4 py-3 text-red-600">{formatCurrency(slip.totalDeductions)}</td>
      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(slip.netSalary)}</td>
      <td className="px-4 py-3">{slip.presentDays}/{slip.workingDays}</td>
      <td className="px-4 py-3"><StatusPill status={slip.status} /></td>
      <td className="px-4 py-3 text-slate-500">{slip.paidOn || "-"}</td>
      <td className="px-4 py-3">
        {canManage && slip.status === "GENERATED" ? (
          showMarkPaid ? (
            <form action={paidAction} className="flex items-center gap-2">
              <input name="payslipId" type="hidden" value={slip.id} />
              <input
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 [color-scheme:light] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                defaultValue={new Date().toISOString().slice(0, 10)}
                name="paidOn"
                type="date"
              />
              <button className="text-xs font-medium text-emerald-600 hover:text-emerald-800" disabled={paidPending} type="submit">Confirm</button>
              <button className="text-xs text-slate-400" onClick={() => setShowMarkPaid(false)} type="button">Cancel</button>
            </form>
          ) : (
            <button className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100" onClick={() => setShowMarkPaid(true)} type="button">
              Mark Paid
            </button>
          )
        ) : null}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "PAID" || status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : status === "GENERATED"
        ? "bg-blue-100 text-blue-700"
        : status === "NOT_SET"
          ? "bg-slate-100 text-slate-500"
          : "bg-amber-100 text-amber-700";

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${className}`}>
      {status === "NOT_SET" ? "Not Set" : status}
    </span>
  );
}

function InputField({ label, name, type = "text", placeholder, defaultValue }: { defaultValue?: string; label: string; name: string; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      <input
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${type === "date" || type === "month" ? "[color-scheme:light]" : ""}`}
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: EmployeeOption[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" name={name}>
        <option value="">Select employee</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      <textarea className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" name={name} placeholder={placeholder} />
    </label>
  );
}
