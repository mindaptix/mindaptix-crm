"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import type {
  EmployeeDetailData,
  EmployeeDetailProjectEntry,
} from "@/features/dashboard/types";
import { updateManagedUserAccess } from "@/features/dashboard/actions/users";
import { EmployeeDocumentsPanel } from "@/features/dashboard/components/employee-documents-panel";
import type { EmployeeDocumentsPageData } from "@/features/dashboard/types";

// ── helpers ───────────────────────────────────────────────────────────────────

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

function getRoleGradient(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-[linear-gradient(135deg,#7c3aed,#4f46e5)]";
    case "MANAGER":
      return "bg-[linear-gradient(135deg,#1d4ed8,#0284c7)]";
    case "SALES":
      return "bg-[linear-gradient(135deg,#d97706,#dc2626)]";
    default:
      return "bg-[linear-gradient(135deg,#059669,#0284c7)]";
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "MANAGER":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "SALES":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "MANAGER":
      return "Admin / Manager";
    case "SALES":
      return "Sales";
    default:
      return "Employee";
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return { label: "In Progress", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
    case "COMPLETED":
      return { label: "Completed", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" };
    case "ON_HOLD":
      return { label: "On Hold", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" };
    default:
      return { label: "Planning", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" };
  }
}

function priorityConfig(priority: string) {
  switch (priority) {
    case "HIGH":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}


function leaveStatusConfig(status: string) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLeaveType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ── main component ────────────────────────────────────────────────────────────

type Tab = "overview" | "projects" | "attendance" | "salary" | "edit" | "documents";

export function EmployeeDetailPanel({ data }: { data: EmployeeDetailData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { employee, salary, projects, currentMonthAttendance, leaveHistory, leaveBalance, recentPayslips, canViewSensitive, canEdit, managerOptions, documents } = data;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "projects", label: `Projects (${projects.length})` },
    { key: "attendance", label: "Attendance & Leave" },
    ...(canViewSensitive ? [{ key: "salary" as Tab, label: "Salary" }] : []),
    { key: "documents", label: `Documents (${documents.length})` },
    ...(canEdit ? [{ key: "edit" as Tab, label: "Edit Profile" }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            className="flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-blue-600"
            href="/dashboard/employees"
          >
            <svg fill="none" height="14" viewBox="0 0 24 24" width="14">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Employees
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800">{employee.fullName}</span>
        </nav>

        {/* ── Employee Header Card ── */}
        <section className={`overflow-hidden rounded-[2rem] shadow-[0_24px_56px_rgba(15,23,42,0.14)] ${getRoleGradient(employee.role)}`}>
          <div className="relative px-6 py-7 sm:px-8 sm:py-8">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-10 right-24 h-40 w-40 rounded-full bg-white/5" />

            <div className="relative flex flex-wrap items-start gap-5">
              {/* Avatar */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] bg-white/20 text-2xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.15)]">
                {getInitials(employee.fullName)}
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{employee.fullName}</h1>
                  <span className={`rounded-full border px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${getRoleBadge(employee.role)}`}>
                    {roleLabel(employee.role)}
                  </span>
                  <span className={`rounded-full border px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${
                    employee.status === "ACTIVE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}>
                    {employee.status}
                  </span>
                </div>

                <p className="mt-1.5 text-base text-white/80">
                  {[employee.designation, employee.department].filter(Boolean).join(" · ") || "No designation set"}
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/70">
                  {employee.employeeId ? (
                    <span className="flex items-center gap-1.5">
                      <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
                        <rect height="14" rx="2" stroke="currentColor" strokeWidth="2" width="16" x="4" y="5" />
                        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                      </svg>
                      {employee.employeeId}
                    </span>
                  ) : null}
                  {employee.joiningDate ? (
                    <span className="flex items-center gap-1.5">
                      <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
                        <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
                        <line stroke="currentColor" strokeWidth="2" x1="3" x2="21" y1="10" y2="10" />
                      </svg>
                      Joined {employee.joiningDate}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${
                      employee.todayStatus === "Present"
                        ? "bg-emerald-400"
                        : employee.todayStatus === "On Leave"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                    }`} />
                    {employee.todayStatus} Today
                  </span>
                </div>
              </div>
            </div>

            {/* Tech stack */}
            {employee.techStack.length > 0 ? (
              <div className="relative mt-5 flex flex-wrap gap-2">
                {employee.techStack.slice(0, 8).map((tech) => (
                  <span
                    className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white"
                    key={tech}
                  >
                    {tech}
                  </span>
                ))}
                {employee.techStack.length > 8 ? (
                  <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    +{employee.techStack.length - 8} more
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Active Projects"
            value={String(projects.filter((p) => p.status === "IN_PROGRESS").length)}
            detail={`${projects.length} total assigned`}
            color="blue"
          />
          <StatCard
            label="Present This Month"
            value={String(currentMonthAttendance.daysPresent)}
            detail={`out of ${currentMonthAttendance.totalWorkingDays} days`}
            color="emerald"
          />
          <StatCard
            label="On Leave This Month"
            value={String(currentMonthAttendance.daysOnLeave)}
            detail="approved leave days"
            color="amber"
          />
          <StatCard
            label="Late Days"
            value={String(currentMonthAttendance.lateCount)}
            detail="this month"
            color="rose"
          />
        </div>

        {/* ── Tab Navigation ── */}
        <div className="overflow-x-auto rounded-[1.6rem] border border-slate-200 bg-white px-2 py-2 shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
          <OverviewTab employee={employee} canViewSensitive={canViewSensitive} />
        ) : activeTab === "projects" ? (
          <ProjectsTab projects={projects} />
        ) : activeTab === "attendance" ? (
          <AttendanceLeaveTab
            attendance={currentMonthAttendance}
            leaveHistory={leaveHistory}
            leaveBalance={leaveBalance}
          />
        ) : activeTab === "salary" && canViewSensitive ? (
          <SalaryTab salary={salary} payslips={recentPayslips} />
        ) : activeTab === "documents" ? (
          <EmployeeDocumentsPanel
            data={{
              documents,
              canManage: canEdit,
              targetUserId: employee.id,
              targetUserName: employee.fullName,
            } satisfies EmployeeDocumentsPageData}
          />
        ) : activeTab === "edit" && canEdit ? (
          <EditProfileTab employee={employee} managerOptions={managerOptions} />
        ) : null}

      </div>
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  color,
  detail,
  label,
  value,
}: {
  color: "blue" | "emerald" | "amber" | "rose";
  detail: string;
  label: string;
  value: string;
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50",
    emerald: "border-emerald-100 bg-emerald-50",
    amber: "border-amber-100 bg-amber-50",
    rose: "border-rose-100 bg-rose-50",
  };
  const valueColors = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  };
  const labelColors = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };

  return (
    <article className={`rounded-[1.4rem] border p-4 ${colors[color]}`}>
      <p className={`text-[0.65rem] font-bold uppercase tracking-[0.22em] ${labelColors[color]}`}>{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ employee, canViewSensitive }: { employee: EmployeeDetailData["employee"]; canViewSensitive: boolean }) {
  const personalFields: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: "Email",
      value: employee.email || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <rect height="16" rx="2" stroke="currentColor" strokeWidth="2" width="20" x="2" y="4" />
          <path d="m2 7 10 7 10-7" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Phone",
      value: employee.phone || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.05 2.8h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 17.09v-.17Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Date of Birth",
      value: employee.dateOfBirth || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
          <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Department",
      value: employee.department || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="2" />
          <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Designation",
      value: employee.designation || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Manager",
      value: employee.managerName || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Emergency Contact",
      value: employee.emergencyContact || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v4l3 3" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Address",
      value: employee.address || "—",
      icon: (
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Personal Info */}
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-blue-600">Personal Information</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Contact & Profile Details</h3>
        </div>
        <div className="grid gap-0 divide-y divide-slate-100">
          {personalFields.map((field) => (
            <div className="flex items-start gap-4 px-6 py-4" key={field.label}>
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                {field.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{field.label}</p>
                <p className="mt-0.5 break-words text-sm font-medium text-slate-800">{field.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bank & Financial Details — admin/super admin only */}
      {canViewSensitive && (employee.bankName || employee.bankAccountNumber || employee.bankIfscCode || employee.panNumber) ? (
        <section className="lg:col-span-2 overflow-hidden rounded-[1.8rem] border border-emerald-100 bg-white shadow-[0_8px_24px_rgba(16,185,129,0.07)]">
          <div className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                <svg fill="none" height="14" viewBox="0 0 24 24" width="14" className="text-emerald-700">
                  <rect height="16" rx="2" width="20" x="2" y="5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 10h20M6 15h2M10 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/>
                </svg>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-emerald-600">Confidential</p>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Bank & Financial Details</h3>
              </div>
              <span className="ml-auto flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.62rem] font-bold text-amber-700">
                <svg fill="none" height="9" viewBox="0 0 24 24" width="9">
                  <rect height="11" rx="2" width="14" x="5" y="11" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/>
                </svg>
                Admin Only
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            {[
              {
                label: "Bank Name",
                value: employee.bankName || "—",
                icon: <svg fill="none" height="14" viewBox="0 0 24 24" width="14"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2"/></svg>,
              },
              {
                label: "Account Number",
                value: employee.bankAccountNumber
                  ? "•".repeat(Math.max(0, employee.bankAccountNumber.length - 4)) + employee.bankAccountNumber.slice(-4)
                  : "—",
                icon: <svg fill="none" height="14" viewBox="0 0 24 24" width="14"><rect height="16" rx="2" width="20" x="2" y="5" stroke="currentColor" strokeWidth="2"/><path d="M2 10h20" stroke="currentColor" strokeWidth="2"/></svg>,
              },
              {
                label: "IFSC Code",
                value: employee.bankIfscCode || "—",
                icon: <svg fill="none" height="14" viewBox="0 0 24 24" width="14"><rect height="18" rx="2" width="14" x="5" y="3" stroke="currentColor" strokeWidth="2"/><path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/></svg>,
              },
              {
                label: "PAN Number",
                value: employee.panNumber || "—",
                icon: <svg fill="none" height="14" viewBox="0 0 24 24" width="14"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="currentColor" strokeWidth="2"/></svg>,
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white px-5 py-4">
                <div className="flex items-center gap-1.5 text-slate-400">{icon}<p className="text-[0.63rem] font-bold uppercase tracking-[0.18em]">{label}</p></div>
                <p className="mt-1.5 font-mono text-sm font-semibold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Document + Quick Info sidebar */}
      <div className="space-y-4">
        {/* Employee ID card */}
        <section className="rounded-[1.6rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Employee ID Card</p>
          <div className="mt-3 space-y-2.5">
            {[
              { label: "Employee Code", value: employee.employeeId || "Not set" },
              { label: "Role", value: roleLabel(employee.role) },
              { label: "Status", value: employee.status },
              { label: "Joining Date", value: employee.joiningDate || "Not set" },
            ].map((item) => (
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-2.5" key={item.label}>
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Document */}
        {employee.documentName ? (
          <section className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-slate-400">Onboarding Document</p>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <svg className="shrink-0 text-blue-500" fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{employee.documentName}</p>
                {employee.documentUrl ? (
                  <a
                    className="mt-0.5 text-xs font-medium text-blue-600 hover:underline"
                    href={employee.documentUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View document →
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ projects }: { projects: EmployeeDetailProjectEntry[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white">
          <svg className="text-slate-400" fill="none" height="24" viewBox="0 0 24 24" width="24">
            <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="3" />
            <path d="M8 12h8M12 8v8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-500">No projects assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const sc = statusConfig(project.status);
        const accentBar =
          sc.dot === "bg-emerald-500" ? "bg-gradient-to-r from-emerald-400 to-teal-400"
          : sc.dot === "bg-blue-500" ? "bg-gradient-to-r from-blue-400 to-cyan-400"
          : sc.dot === "bg-amber-500" ? "bg-gradient-to-r from-amber-400 to-orange-400"
          : "bg-gradient-to-r from-slate-300 to-slate-400";

        return (
          <Link
            className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)]"
            href={`/dashboard/projects/${project.id}`}
            key={project.id}
          >
            {/* Status accent */}
            <div className={`h-1.5 w-full ${accentBar}`} />

            <div className="p-5">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold leading-snug text-slate-900 transition group-hover:text-blue-700">
                  {project.name}
                </h3>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${sc.bg} ${sc.text} ${sc.border}`}>
                  {sc.label}
                </span>
              </div>

              {/* Priority + due date */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${priorityConfig(project.priority)}`}>
                  {project.priority} Priority
                </span>
                {project.dueDate ? (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                      <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
                      <line stroke="currentColor" strokeWidth="2" x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    Due {project.dueDate}
                  </span>
                ) : null}
              </div>

              {/* Summary */}
              {project.summary ? (
                <p className="mt-3 line-clamp-2 text-[0.78rem] leading-5 text-slate-500">{project.summary}</p>
              ) : null}

              {/* Stats row */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  {project.assignedUserNames.length} member{project.assignedUserNames.length !== 1 ? "s" : ""}
                </div>
                <span className="text-[0.68rem] font-semibold text-blue-500 transition group-hover:text-blue-700">
                  View Full Details →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Attendance & Leave Tab ────────────────────────────────────────────────────

function AttendanceLeaveTab({
  attendance,
  leaveBalance,
  leaveHistory,
}: {
  attendance: EmployeeDetailData["currentMonthAttendance"];
  leaveBalance: EmployeeDetailData["leaveBalance"];
  leaveHistory: EmployeeDetailData["leaveHistory"];
}) {
  return (
    <div className="space-y-5">
      {/* Monthly attendance cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Days Present", value: attendance.daysPresent, color: "emerald", detail: "Check-in recorded" },
          { label: "Days Completed", value: attendance.daysCompleted, color: "blue", detail: "Full checkout done" },
          { label: "Days on Leave", value: attendance.daysOnLeave, color: "amber", detail: "Approved leaves" },
          { label: "Late Arrivals", value: attendance.lateCount, color: "rose", detail: "Marked late" },
        ].map((item) => (
          <StatCard
            color={item.color as "blue" | "emerald" | "amber" | "rose"}
            detail={item.detail}
            key={item.label}
            label={item.label}
            value={String(item.value)}
          />
        ))}
      </section>

      {/* Attendance progress bar */}
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">This Month</p>
            <h4 className="mt-1 text-lg font-bold text-slate-900">Attendance Progress</h4>
          </div>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-700">
            {attendance.monthLabel}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{attendance.daysPresent} present</span>
            <span>{attendance.totalWorkingDays} working days</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, attendance.totalWorkingDays > 0 ? (attendance.daysPresent / attendance.totalWorkingDays) * 100 : 0)}%` }}
            />
          </div>
          <div className="mt-2 text-right text-xs font-semibold text-slate-400">
            {attendance.totalWorkingDays > 0
              ? Math.round((attendance.daysPresent / attendance.totalWorkingDays) * 100)
              : 0}% attendance rate
          </div>
        </div>
      </section>

      {/* Leave Balance */}
      {leaveBalance ? (
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Leave Balance</p>
          <h4 className="mt-1 text-lg font-bold text-slate-900">Current Year Quota</h4>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Paid Leave", total: leaveBalance.paidLeaveTotal, used: leaveBalance.paidLeaveUsed, remaining: leaveBalance.paidLeaveRemaining, color: "#2563eb" },
              { label: "Sick Leave", total: leaveBalance.sickLeaveTotal, used: leaveBalance.sickLeaveUsed, remaining: leaveBalance.sickLeaveRemaining, color: "#f59e0b" },
              { label: "Casual Leave", total: leaveBalance.casualLeaveTotal, used: leaveBalance.casualLeaveUsed, remaining: leaveBalance.casualLeaveRemaining, color: "#10b981" },
            ].map((lb) => (
              <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-4" key={lb.label}>
                <p className="text-xs font-semibold text-slate-500">{lb.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ color: lb.color }}>{lb.remaining}</p>
                <p className="mt-0.5 text-xs text-slate-400">remaining of {lb.total}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${lb.total > 0 ? Math.max(0, ((lb.total - lb.used) / lb.total) * 100) : 0}%`,
                      background: lb.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Leave History */}
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Leave History</p>
          <h4 className="mt-1 text-lg font-bold text-slate-900">This Year&apos;s Requests</h4>
        </div>
        {leaveHistory.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {leaveHistory.map((leave) => (
              <div className="flex flex-wrap items-center gap-3 px-6 py-4" key={leave.id}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{formatLeaveType(leave.leaveType)}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${leaveStatusConfig(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {leave.startDate} → {leave.endDate} · {leave.requestedDays} day{leave.requestedDays !== 1 ? "s" : ""}
                  </p>
                  {leave.reason ? (
                    <p className="mt-1 text-xs text-slate-500">{leave.reason}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-400">No leave requests found for this year.</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Edit Profile Tab ──────────────────────────────────────────────────────────

const INPUT_CLS = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50";
const LABEL_CLS = "mb-1.5 block text-sm font-medium text-slate-700";

function EditProfileTab({
  employee,
  managerOptions,
}: {
  employee: EmployeeDetailData["employee"];
  managerOptions: EmployeeDetailData["managerOptions"];
}) {
  const [state, dispatch, pending] = useActionState(updateManagedUserAccess, { values: {} });

  const v = state.values ?? {};
  const joiningDateVal = (v.joiningDate ?? employee.joiningDate ?? "").slice(0, 10);
  const dobVal = (v.dateOfBirth ?? employee.dateOfBirth ?? "").slice(0, 10);
  const defaultRole = (employee.role === "SUPER_ADMIN" ? "MANAGER" : employee.role) as string;

  function handleSubmit(formData: FormData) {
    // Convert comma-separated techStack input into multiple entries that the action expects
    const raw = String(formData.get("techStackInput") ?? "");
    formData.delete("techStackInput");
    raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((tech) => {
      formData.append("techStack", tech);
    });
    return dispatch(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <input type="hidden" name="userId" value={employee.id} />

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{state.success}</div>
      ) : null}

      {/* Account Info */}
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 py-4" style={{ background: "linear-gradient(135deg,#f8faff,#eef4ff)" }}>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-blue-600">Account</p>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">Basic Information</h3>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL_CLS}>Full Name <span className="text-rose-500">*</span></span>
            <input className={INPUT_CLS} defaultValue={v.fullName ?? employee.fullName} name="fullName" placeholder="Full name" required />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Email Address <span className="text-rose-500">*</span></span>
            <input className={INPUT_CLS} defaultValue={v.email ?? employee.email} name="email" placeholder="Email" required type="email" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Phone Number</span>
            <input className={INPUT_CLS} defaultValue={v.phone ?? employee.phone} name="phone" placeholder="+91 98765 43210" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Joining Date</span>
            <input className={INPUT_CLS} defaultValue={joiningDateVal} name="joiningDate" type="date" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Employee ID</span>
            <input className={INPUT_CLS} defaultValue={v.employeeId ?? employee.employeeId} name="employeeId" placeholder="EMP-001" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Status</span>
            <select className={INPUT_CLS} defaultValue={v.status ?? employee.status} name="status">
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Role</span>
            <select className={INPUT_CLS} defaultValue={v.role ?? defaultRole} name="role">
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Admin / Manager</option>
              <option value="SALES">Sales</option>
            </select>
          </label>
          {managerOptions.length > 0 ? (
            <label className="block">
              <span className={LABEL_CLS}>Reporting Manager</span>
              <select className={INPUT_CLS} defaultValue={v.managerId ?? employee.managerId} name="managerId">
                <option value="">— No manager —</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      {/* Personal Details */}
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 py-4" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-emerald-600">Profile</p>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">Personal Details</h3>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL_CLS}>Designation</span>
            <input className={INPUT_CLS} defaultValue={v.designation ?? employee.designation} name="designation" placeholder="e.g. Senior Developer" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Department</span>
            <input className={INPUT_CLS} defaultValue={v.department ?? employee.department} name="department" placeholder="e.g. Engineering" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Date of Birth</span>
            <input className={INPUT_CLS} defaultValue={dobVal} name="dateOfBirth" type="date" />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Emergency Contact</span>
            <input className={INPUT_CLS} defaultValue={v.emergencyContact ?? employee.emergencyContact} name="emergencyContact" placeholder="Name and phone number" />
          </label>
          <label className="col-span-full block">
            <span className={LABEL_CLS}>Address</span>
            <input className={INPUT_CLS} defaultValue={v.address ?? employee.address} name="address" placeholder="Full address" />
          </label>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-6 py-4" style={{ background: "linear-gradient(135deg,#fdf4ff,#fae8ff)" }}>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-purple-600">Skills</p>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">Tech Stack</h3>
        </div>
        <div className="p-6">
          <input
            className={INPUT_CLS}
            defaultValue={(v.techStack as string[] | undefined)?.join(", ") ?? employee.techStack.join(", ")}
            name="techStackInput"
            placeholder="e.g. React, Node.js, MongoDB"
          />
          <p className="mt-1.5 text-xs text-slate-400">Separate each skill with a comma.</p>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-2">
        <button
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving changes…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Salary Tab ────────────────────────────────────────────────────────────────

function SalaryTab({
  payslips,
  salary,
}: {
  payslips: EmployeeDetailData["recentPayslips"];
  salary: EmployeeDetailData["salary"];
}) {
  return (
    <div className="space-y-5">
      {salary ? (
        <>
          {/* Net salary highlight */}
          <section className="overflow-hidden rounded-[1.8rem] bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.3em] text-blue-200">Monthly Compensation</p>
                <p className="mt-2 text-4xl font-black text-white">{formatCurrency(salary.netSalary)}</p>
                <p className="mt-1 text-sm text-blue-200">Net salary · Effective from {salary.effectiveFrom}</p>
              </div>
              <span className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                salary.status === "ACTIVE"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-300"
              }`}>
                {salary.status}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Gross Salary", value: formatCurrency(salary.grossSalary) },
                { label: "Total Deductions", value: formatCurrency(salary.tds + salary.providentFund + salary.otherDeductions) },
                { label: "Take Home", value: formatCurrency(salary.netSalary), highlight: true },
              ].map((item) => (
                <div className={`rounded-[1rem] px-4 py-3 ${item.highlight ? "border border-white/20 bg-white/10" : "border border-white/10 bg-white/5"}`} key={item.label}>
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-blue-200">{item.label}</p>
                  <p className={`mt-1.5 text-lg font-bold ${item.highlight ? "text-white" : "text-blue-100"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Salary breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Earnings */}
            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-emerald-600">Earnings</p>
              <h4 className="mt-1 text-base font-bold text-slate-900">Salary Components</h4>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Basic Salary", value: salary.basicSalary },
                  { label: "HRA", value: salary.hra },
                  { label: "Transport Allowance", value: salary.transportAllowance },
                  { label: "Medical Allowance", value: salary.medicalAllowance },
                  { label: "Other Allowances", value: salary.otherAllowances },
                ].map((item) => (
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5" key={item.label}>
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.value > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                  <span className="text-sm font-bold text-emerald-800">Gross Total</span>
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(salary.grossSalary)}</span>
                </div>
              </div>
            </section>

            {/* Deductions */}
            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-rose-600">Deductions</p>
              <h4 className="mt-1 text-base font-bold text-slate-900">Monthly Deductions</h4>
              <div className="mt-4 space-y-2">
                {[
                  { label: "TDS (Tax)", value: salary.tds },
                  { label: "Provident Fund", value: salary.providentFund },
                  { label: "Other Deductions", value: salary.otherDeductions },
                ].map((item) => (
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5" key={item.label}>
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.value > 0 ? "text-rose-700" : "text-slate-400"}`}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
                  <span className="text-sm font-bold text-rose-800">Total Deductions</span>
                  <span className="text-sm font-bold text-rose-700">
                    {formatCurrency(salary.tds + salary.providentFund + salary.otherDeductions)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">No active salary structure found for this employee.</p>
        </div>
      )}

      {/* Payslip History */}
      {payslips.length > 0 ? (
        <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-blue-600">Payslip History</p>
            <h4 className="mt-1 text-lg font-bold text-slate-900">Recent Months</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {payslips.map((payslip) => (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4" key={payslip.id}>
                <div>
                  <p className="text-sm font-bold text-slate-900">{payslip.monthKey}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {payslip.presentDays}/{payslip.workingDays} days · {payslip.paidOn ? `Paid ${payslip.paidOn}` : "Not paid yet"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(payslip.netSalary)}</p>
                    <p className="mt-0.5 text-xs text-slate-400">net pay</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${
                    payslip.status === "PAID"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : payslip.status === "GENERATED"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}>
                    {payslip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
