"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectDetailData, ProjectDetailEmployeeEntry } from "@/features/dashboard/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function statusConfig(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        gradient: "from-emerald-500 to-teal-500",
        headerGrad: "bg-[linear-gradient(135deg,#064e3b_0%,#059669_60%,#d1fae5_100%)]",
        dotColor: "bg-emerald-400 animate-pulse",
        chipBg: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        gradient: "from-slate-500 to-slate-600",
        headerGrad: "bg-[linear-gradient(135deg,#1e293b_0%,#334155_60%,#e2e8f0_100%)]",
        dotColor: "bg-slate-400",
        chipBg: "border-slate-200 bg-slate-100 text-slate-600",
      };
    case "ON_HOLD":
      return {
        label: "On Hold",
        gradient: "from-amber-500 to-orange-500",
        headerGrad: "bg-[linear-gradient(135deg,#78350f_0%,#d97706_60%,#fef3c7_100%)]",
        dotColor: "bg-amber-400",
        chipBg: "border-amber-200 bg-amber-50 text-amber-700",
      };
    default:
      return {
        label: "Planning",
        gradient: "from-blue-500 to-indigo-600",
        headerGrad: "bg-[linear-gradient(135deg,#1e3a8a_0%,#2563eb_60%,#bfdbfe_100%)]",
        dotColor: "bg-blue-400",
        chipBg: "border-blue-200 bg-blue-50 text-blue-700",
      };
  }
}


function paymentStatusConfig(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PARTIAL":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "OVERDUE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function roleGradient(role: string) {
  switch (role) {
    case "SUPER_ADMIN": return "from-violet-500 to-purple-600";
    case "MANAGER": return "from-blue-500 to-indigo-600";
    case "SALES": return "from-amber-500 to-orange-500";
    default: return "from-emerald-500 to-teal-600";
  }
}

function roleBadge(role: string) {
  switch (role) {
    case "SUPER_ADMIN": return "border-violet-200 bg-violet-50 text-violet-700";
    case "MANAGER": return "border-blue-200 bg-blue-50 text-blue-700";
    case "SALES": return "border-amber-200 bg-amber-50 text-amber-700";
    default: return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "SUPER_ADMIN": return "Super Admin";
    case "MANAGER": return "Admin";
    case "SALES": return "Sales";
    default: return "Employee";
  }
}

type Tab = "overview" | "team" | "payments" | "dsr";

// ── main component ────────────────────────────────────────────────────────────

export function ProjectDetailPanel({ data }: { data: ProjectDetailData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedEmployee, setSelectedEmployee] = useState<ProjectDetailEmployeeEntry | null>(null);

  const sc = statusConfig(data.status);
  const isOverdue = data.dueDate && data.dueDate < new Date().toISOString().slice(0, 10) && data.status !== "COMPLETED";
  const collectionPct = data.totalPayment > 0 ? Math.round((data.totalReceived / data.totalPayment) * 100) : 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "team", label: `Team (${data.assignedEmployees.length})` },
    { key: "payments", label: `Payments (${data.payments.length})` },
    { key: "dsr", label: `Work Logs (${data.dsrTotalCount})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            className="flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-blue-600"
            href="/dashboard/projects"
          >
            <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Projects
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800 line-clamp-1">{data.name}</span>
        </nav>

        {/* ── Project Header ── */}
        <section className={`overflow-hidden rounded-[2rem] shadow-[0_24px_56px_rgba(15,23,42,0.18)] ${sc.headerGrad}`}>
          <div className="relative px-6 py-7 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-12 right-28 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white">
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dotColor}`} />
                  {sc.label}
                </span>
                <span className="rounded-full border border-white/20 bg-white/15 px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white">
                  {data.priority} Priority
                </span>
                {data.closedByEmployeeId ? (
                  <span className="rounded-full border border-white/30 bg-white/20 px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white">
                    ✓ Closed by Employee {data.closedByEmployeeAt ? `· ${data.closedByEmployeeAt}` : ""}
                  </span>
                ) : null}
                {isOverdue ? (
                  <span className="rounded-full border border-rose-300/40 bg-rose-500/30 px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white">
                    ⚠ Overdue
                  </span>
                ) : null}
              </div>

              {/* Title */}
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{data.name}</h1>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                {data.dueDate ? (
                  <span className="flex items-center gap-1.5">
                    <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
                      <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
                      <line stroke="currentColor" strokeWidth="2" x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    Deadline {data.dueDate}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  {data.assignedEmployees.length} team member{data.assignedEmployees.length !== 1 ? "s" : ""}
                </span>
                {data.createdByName ? (
                  <span className="flex items-center gap-1.5">
                    <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Created by {data.createdByName}
                  </span>
                ) : null}
              </div>

              {/* Tech stack */}
              {data.techStack.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.techStack.map((tech) => (
                    <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white" key={tech}>
                      {tech}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Client + Budget strip */}
          {(data.clientName || data.clientBudget > 0) ? (
            <div className="border-t border-white/10 px-6 py-3 sm:px-8">
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                {data.clientName ? (
                  <span className="flex items-center gap-2">
                    <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="2" />
                      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="font-bold text-white">{data.clientName}</span>
                  </span>
                ) : null}
                {data.clientBudget > 0 ? (
                  <span className="flex items-center gap-2">
                    <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                      <line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="1" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Agreed Budget: <span className="font-bold text-white">{formatCurrency(data.clientBudget)}</span>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

        {/* Payment progress bar inside header */}
          {data.totalPayment > 0 ? (
            <div className="border-t border-white/10 px-6 py-4 sm:px-8">
              <div className="flex items-center justify-between text-xs font-semibold text-white/70">
                <span>Payment Collection</span>
                <span>{collectionPct}% collected</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 transition-all duration-700"
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/60">
                <span>Received {formatCurrency(data.totalReceived)}</span>
                <span>Pending {formatCurrency(data.totalBalance)}</span>
              </div>
            </div>
          ) : null}
        </section>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat
            label="Total Value"
            value={data.totalPayment > 0 ? formatCurrency(data.totalPayment) : "—"}
            detail="total project value"
            color="blue"
          />
          <QuickStat
            label="Collected"
            value={data.totalReceived > 0 ? formatCurrency(data.totalReceived) : "—"}
            detail="payment received"
            color="emerald"
          />
          <QuickStat
            label="Balance Due"
            value={data.totalBalance > 0 ? formatCurrency(data.totalBalance) : "—"}
            detail="yet to collect"
            color={data.totalBalance > 0 ? "rose" : "slate"}
          />
          <QuickStat
            label="DSR Logs"
            value={String(data.dsrTotalCount)}
            detail="total work entries"
            color="violet"
          />
        </div>

        {/* ── Tab Navigation ── */}
        <div className="overflow-x-auto rounded-[1.6rem] border border-slate-200 bg-white px-2 py-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "overview" ? (
          <OverviewTab data={data} />
        ) : activeTab === "team" ? (
          <TeamTab
            employees={data.assignedEmployees}
            onSelectEmployee={setSelectedEmployee}
          />
        ) : activeTab === "payments" ? (
          <PaymentsTab
            payments={data.payments}
            totalBalance={data.totalBalance}
            totalPayment={data.totalPayment}
            totalReceived={data.totalReceived}
          />
        ) : activeTab === "dsr" ? (
          <DsrTab employees={data.assignedEmployees} />
        ) : null}

        {/* ── Employee DSR Drawer ── */}
        {selectedEmployee ? (
          <EmployeeDsrDrawer
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── QuickStat ─────────────────────────────────────────────────────────────────

function QuickStat({
  color,
  detail,
  label,
  value,
}: {
  color: "blue" | "emerald" | "rose" | "violet" | "slate";
  detail: string;
  label: string;
  value: string;
}) {
  const styles = {
    blue: { border: "border-blue-100", bg: "bg-blue-50", val: "text-blue-700", lbl: "text-blue-600" },
    emerald: { border: "border-emerald-100", bg: "bg-emerald-50", val: "text-emerald-700", lbl: "text-emerald-600" },
    rose: { border: "border-rose-100", bg: "bg-rose-50", val: "text-rose-700", lbl: "text-rose-600" },
    violet: { border: "border-violet-100", bg: "bg-violet-50", val: "text-violet-700", lbl: "text-violet-600" },
    slate: { border: "border-slate-200", bg: "bg-slate-50", val: "text-slate-700", lbl: "text-slate-500" },
  }[color];

  return (
    <article className={`rounded-[1.4rem] border p-4 ${styles.border} ${styles.bg}`}>
      <p className={`text-[0.62rem] font-bold uppercase tracking-[0.22em] ${styles.lbl}`}>{label}</p>
      <p className={`mt-2 text-2xl font-black leading-tight ${styles.val}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: ProjectDetailData }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      {/* Project Details */}
      <section className="space-y-4">
        {/* Summary */}
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Project Description</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {data.summary || "No description has been added for this project yet."}
          </p>
        </div>

        {/* Tech Stack */}
        {data.techStack.length > 0 ? (
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Technologies Used</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.techStack.map((tech) => (
                <span
                  className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
                  key={tech}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Team Preview */}
        {data.assignedEmployees.length > 0 ? (
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Team Members</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.assignedEmployees.map((emp) => (
                <Link
                  className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  href={`/dashboard/employees/${emp.id}`}
                  key={emp.id}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[0.45rem] font-black text-white ${roleGradient(emp.role)}`}>
                    {getInitials(emp.fullName)}
                  </span>
                  {emp.fullName}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Client Info Card */}
        {(data.clientName || data.clientBudget > 0) ? (
          <section className="rounded-[1.6rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Client Details</p>
            <div className="mt-3 space-y-2">
              {data.clientName ? (
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <svg className="text-blue-600" fill="none" height="14" viewBox="0 0 24 24" width="14">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="2" />
                      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Client / Company</p>
                    <p className="text-sm font-bold text-slate-900">{data.clientName}</p>
                  </div>
                </div>
              ) : null}
              {data.clientBudget > 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-2.5">
                  <span className="text-xs font-medium text-slate-500">Agreed Budget</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(data.clientBudget)}</span>
                </div>
              ) : null}
              {data.clientBudget > 0 && data.totalReceived > 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-2.5">
                  <span className="text-xs font-medium text-slate-500">Collected so far</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatCurrency(data.totalReceived)} ({Math.round((data.totalReceived / data.clientBudget) * 100)}%)
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Project Info Card */}
        <section className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-slate-400">Project Info</p>
          <div className="mt-3 space-y-2.5">
            {[
              { label: "Status", value: statusConfig(data.status).label },
              { label: "Priority", value: data.priority },
              { label: "Deadline", value: data.dueDate || "Not set" },
              { label: "Created By", value: data.createdByName || "Unknown" },
              { label: "Team Size", value: `${data.assignedEmployees.length} member${data.assignedEmployees.length !== 1 ? "s" : ""}` },
              { label: "Work Logs", value: `${data.dsrTotalCount} DSR entries` },
            ].map((item) => (
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5" key={item.label}>
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Payment snapshot + Add Payment CTA */}
        <section className="rounded-[1.6rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-emerald-600">Payment Snapshot</p>
            <Link
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
              href="/dashboard/payments"
            >
              <svg fill="none" height="11" viewBox="0 0 24 24" width="11">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
              Add Payment
            </Link>
          </div>
          {data.payments.length > 0 ? (
            <div className="mt-3 space-y-2">
              {[
                { label: "Total Value", value: formatCurrency(data.totalPayment), color: "text-slate-900" },
                { label: "Received", value: formatCurrency(data.totalReceived), color: "text-emerald-700" },
                { label: "Pending", value: formatCurrency(data.totalBalance), color: data.totalBalance > 0 ? "text-rose-700" : "text-slate-400" },
              ].map((item) => (
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-2.5" key={item.label}>
                  <span className="text-xs font-medium text-slate-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
              {data.totalPayment > 0 ? (
                <div className="mt-1">
                  <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${Math.min(100, (data.totalReceived / data.totalPayment) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-emerald-600">
                    {Math.round((data.totalReceived / data.totalPayment) * 100)}% collected
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-white px-4 py-4 text-center">
              <p className="text-xs font-semibold text-slate-500">No payments added yet.</p>
              <p className="mt-1 text-[0.68rem] text-slate-400">
                Go to <strong>Payments page</strong> → Add a record → type <strong>&quot;{data.name}&quot;</strong> as the project name to link it here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab({
  employees,
  onSelectEmployee,
}: {
  employees: ProjectDetailEmployeeEntry[];
  onSelectEmployee: (emp: ProjectDetailEmployeeEntry) => void;
}) {
  if (employees.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <p className="text-sm font-semibold text-slate-500">No team members assigned to this project yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {employees.map((emp) => (
        <article
          className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,23,42,0.10)]"
          key={emp.id}
        >
          {/* Gradient header */}
          <div className={`relative h-20 bg-gradient-to-br ${roleGradient(emp.role)} overflow-hidden`}>
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
            {/* Today status dot */}
            <div className="absolute right-4 top-4">
              <span className={`flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-wider text-white`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  emp.todayStatus === "Present" ? "bg-emerald-300 animate-pulse" :
                  emp.todayStatus === "On Leave" ? "bg-amber-300" : "bg-rose-300"
                }`} />
                {emp.todayStatus}
              </span>
            </div>
            {/* Avatar */}
            <div className="absolute -bottom-5 left-5 flex h-14 w-14 items-center justify-center rounded-[1rem] border-2 border-white bg-white/20 text-base font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              {getInitials(emp.fullName)}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pb-4 pt-7">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900">{emp.fullName}</h3>
                <p className="mt-0.5 truncate text-xs text-slate-500">{emp.designation || emp.email}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider ${roleBadge(emp.role)}`}>
                {roleLabel(emp.role)}
              </span>
            </div>

            {/* Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                <p className="text-lg font-black text-blue-600">{emp.dsrEntries.length}</p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-400">DSR Logs</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                <p className="text-xs font-bold text-slate-700">{emp.department || "—"}</p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-400">Dept</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                onClick={() => onSelectEmployee(emp)}
                type="button"
              >
                View Work Logs
              </button>
              <Link
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                href={`/dashboard/employees/${emp.id}`}
              >
                Profile →
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

function PaymentsTab({
  payments,
  totalBalance,
  totalPayment,
  totalReceived,
}: {
  payments: ProjectDetailData["payments"];
  totalBalance: number;
  totalPayment: number;
  totalReceived: number;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <p className="text-sm font-semibold text-slate-500">No payment records linked to this project.</p>
        <p className="mt-1 text-xs text-slate-400">Payments are matched by project name from the Payments module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Value", value: formatCurrency(totalPayment), color: "text-slate-900", bg: "bg-slate-50 border-slate-200" },
          { label: "Received", value: formatCurrency(totalReceived), color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Balance Due", value: formatCurrency(totalBalance), color: totalBalance > 0 ? "text-rose-700" : "text-slate-500", bg: totalBalance > 0 ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-200" },
        ].map((item) => (
          <div className={`rounded-[1.4rem] border p-4 ${item.bg}`} key={item.label}>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className={`mt-2 text-xl font-black ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalPayment > 0 ? (
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-700">Collection Progress</span>
            <span className="font-bold text-emerald-600">{Math.round((totalReceived / totalPayment) * 100)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (totalReceived / totalPayment) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Payment cards */}
      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm"
            key={payment.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{payment.clientName || "Client"}</h4>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-wider ${paymentStatusConfig(payment.status)}`}>
                    {payment.status}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-400">
                  {payment.invoiceNumber ? <span>#{payment.invoiceNumber}</span> : null}
                  {payment.dueDate ? <span>Due {payment.dueDate}</span> : null}
                  {payment.receivedDate ? <span>Received {payment.receivedDate}</span> : null}
                  {payment.createdByName ? <span>by {payment.createdByName}</span> : null}
                </div>
                {payment.note ? (
                  <p className="mt-1.5 text-xs text-slate-500">{payment.note}</p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="text-lg font-black text-emerald-700">{formatCurrency(payment.receivedAmount)}</p>
                <p className="mt-0.5 text-xs text-slate-400">of {formatCurrency(payment.totalAmount)}</p>
              </div>
            </div>

            {/* Per-invoice progress */}
            {payment.totalAmount > 0 ? (
              <div className="border-t border-slate-100 px-5 py-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Balance: {formatCurrency(payment.balanceDue)}</span>
                  <span>{Math.round((payment.receivedAmount / payment.totalAmount) * 100)}% collected</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${payment.status === "OVERDUE" ? "bg-rose-400" : "bg-emerald-400"}`}
                    style={{ width: `${Math.min(100, (payment.receivedAmount / payment.totalAmount) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DSR Tab ───────────────────────────────────────────────────────────────────

function DsrTab({ employees }: { employees: ProjectDetailEmployeeEntry[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("ALL");

  const allDsr = employees.flatMap((emp) =>
    emp.dsrEntries.map((dsr) => ({ ...dsr, employeeName: emp.fullName, employeeId: emp.id }))
  ).sort((a, b) => b.workDate.localeCompare(a.workDate));

  const filteredDsr = selectedEmpId === "ALL"
    ? allDsr
    : allDsr.filter((d) => d.employeeId === selectedEmpId);

  if (allDsr.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <p className="text-sm font-semibold text-slate-500">No DSR work logs have been submitted for this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Employee filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${selectedEmpId === "ALL" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
          onClick={() => setSelectedEmpId("ALL")}
          type="button"
        >
          All ({allDsr.length})
        </button>
        {employees.filter((e) => e.dsrEntries.length > 0).map((emp) => (
          <button
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${selectedEmpId === emp.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
            key={emp.id}
            onClick={() => setSelectedEmpId(emp.id)}
            type="button"
          >
            {emp.fullName} ({emp.dsrEntries.length})
          </button>
        ))}
      </div>

      {/* DSR entries */}
      <div className="space-y-3">
        {filteredDsr.map((dsr) => (
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm" key={dsr.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-[0.55rem] font-black text-white`}>
                  DSR
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{dsr.workDate}</p>
                  <p className="text-xs font-semibold text-blue-600">{dsr.employeeName}</p>
                </div>
              </div>
              <Link
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                href={`/dashboard/employees/${dsr.employeeId}`}
              >
                View Profile
              </Link>
            </div>

            {dsr.summary ? (
              <p className="mt-3 text-sm leading-6 text-slate-700">{dsr.summary}</p>
            ) : null}

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {dsr.accomplishments ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-emerald-700">✓ Done</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-700">{dsr.accomplishments}</p>
                </div>
              ) : null}
              {dsr.blockers ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-rose-700">⚠ Blockers</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-700">{dsr.blockers}</p>
                </div>
              ) : null}
              {dsr.nextPlan ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-blue-700">→ Next</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-700">{dsr.nextPlan}</p>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Employee DSR Drawer ───────────────────────────────────────────────────────

function EmployeeDsrDrawer({
  employee,
  onClose,
}: {
  employee: ProjectDetailEmployeeEntry;
  onClose: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-8px_60px_rgba(15,23,42,0.25)] sm:max-w-xl sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`shrink-0 px-6 pb-5 pt-5 bg-gradient-to-br ${roleGradient(employee.role)}`}>
          <div className="mb-3 mx-auto h-1 w-10 rounded-full bg-white/30 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-white/20 text-sm font-black text-white">
                {getInitials(employee.fullName)}
              </div>
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.26em] text-white/60">Work Logs</p>
                <h3 className="text-base font-bold text-white">{employee.fullName}</h3>
                <p className="text-xs text-white/70">{employee.designation || employee.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
                href={`/dashboard/employees/${employee.id}`}
              >
                Full Profile
              </Link>
              <button
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                onClick={onClose}
                type="button"
              >
                <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* DSR list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {employee.dsrEntries.length > 0 ? (
            <div className="space-y-3 px-5 py-4">
              {employee.dsrEntries.map((dsr) => (
                <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4" key={dsr.id}>
                  <p className="text-xs font-bold text-slate-600">{dsr.workDate}</p>
                  {dsr.summary ? (
                    <p className="mt-2 text-sm leading-5 text-slate-700">{dsr.summary}</p>
                  ) : null}
                  <div className="mt-2 space-y-2">
                    {dsr.accomplishments ? (
                      <div className="rounded-lg bg-emerald-50 px-3 py-2">
                        <p className="text-[0.56rem] font-bold uppercase tracking-wider text-emerald-600">Done</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{dsr.accomplishments}</p>
                      </div>
                    ) : null}
                    {dsr.blockers ? (
                      <div className="rounded-lg bg-rose-50 px-3 py-2">
                        <p className="text-[0.56rem] font-bold uppercase tracking-wider text-rose-600">Blockers</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{dsr.blockers}</p>
                      </div>
                    ) : null}
                    {dsr.nextPlan ? (
                      <div className="rounded-lg bg-blue-50 px-3 py-2">
                        <p className="text-[0.56rem] font-bold uppercase tracking-wider text-blue-600">Next</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{dsr.nextPlan}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-slate-400">No DSR logs from {employee.fullName} on this project.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
