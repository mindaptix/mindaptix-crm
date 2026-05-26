"use client";

import React from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createManagedUser, deleteManagedUser, updateManagedUserAccess } from "@/features/dashboard/actions/users";
import { SalesWorkspacePanel } from "@/features/dashboard/components/sales-workspace-panel";
import { emitDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import { FormActionButton } from "@/shared/ui/form-action-button";
import { INITIAL_USER_MANAGEMENT_STATE } from "@/features/auth/lib/user-management-form-state";
import type {
  EmployeeDirectoryEntry,
  EmployeeOption,
  SalesLeadEntry,
  SalesWorkspaceData,
  SummaryCard,
} from "@/features/dashboard/types";

type EmployeesManagementPanelProps = {
  readOnly?: boolean;
  salesLeadPriorityOptions: string[];
  salesLeadSourceOptions: string[];
  salesLeadStatusOptions: string[];
  salesLeadRows: SalesLeadEntry[];
  salesWorkspace: SalesWorkspaceData;
  salesOnly?: boolean;
  salesOptions: EmployeeOption[];
  salesTechnologyOptions: string[];
  summaryCards: SummaryCard[];
  users: EmployeeDirectoryEntry[];
};
export function EmployeesManagementPanel({
  readOnly = false,
  salesLeadPriorityOptions,
  salesLeadSourceOptions,
  salesLeadStatusOptions,
  salesLeadRows,
  salesWorkspace,
  salesOnly = false,
  salesOptions,
  salesTechnologyOptions,
  summaryCards,
  users,
}: EmployeesManagementPanelProps) {
  const [userState, createUserAction, userPending] = useActionState(createManagedUser, INITIAL_USER_MANAGEMENT_STATE);
  const [updateUserState, updateUserAction, updateUserPending] = useActionState(updateManagedUserAccess, INITIAL_USER_MANAGEMENT_STATE);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"directory" | "create">("directory");
  const [createSection, setCreateSection] = useState<"account" | "profile" | "bank">("account");
  const [editSection, setEditSection] = useState<"account" | "profile" | "bank">("account");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lastUpdateSuccess, setLastUpdateSuccess] = useState<string | null>(null);
  const techSummary = buildTechSummary(users);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [user.fullName, user.email, user.phone, user.managerName, user.role, user.status, user.todayStatus, ...(user.techStack ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [roleFilter, searchTerm, users]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;
  const canManageWorkspace = !readOnly && !salesOnly;
  const shouldShowDirectory = !salesOnly;
  const shouldShowSalesTracker = salesOnly || salesOptions.length > 0 || salesLeadRows.length > 0;

  useEffect(() => {
    if (userState.success) {
      emitDashboardSync("user-created");
    }
  }, [userState.success]);

  useEffect(() => {
    if (updateUserState.success) {
      emitDashboardSync("user-updated");
    }
  }, [updateUserState.success]);

  useEffect(() => {
    if (!isEditModalOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditModalOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditModalOpen]);

  useEffect(() => {
    if (!updateUserState.success) {
      return;
    }

    if (updateUserState.success === lastUpdateSuccess) {
      return;
    }

    setLastUpdateSuccess(updateUserState.success);

    if (!isEditModalOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsEditModalOpen(false);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isEditModalOpen, lastUpdateSuccess, updateUserState.success]);

  return (
    <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <OverviewCard detail={card.detail} key={card.label} label={card.label} value={card.value} />
        ))}
      </section>

      {shouldShowDirectory ? (
        <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">

          {/* Section header + tab bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-500">
                {readOnly ? "Workforce Overview" : "Team Management"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {readOnly ? "Company Workforce" : "Employee Directory"}
              </h2>
            </div>

            {canManageWorkspace ? (
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  {users.length} employee{users.length !== 1 ? "s" : ""}
                </span>
                <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "directory" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    onClick={() => setActiveTab("directory")}
                    type="button"
                  >
                    Directory
                  </button>
                  <button
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "create" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    onClick={() => setActiveTab("create")}
                    type="button"
                  >
                    + Add Employee
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* CREATE EMPLOYEE TAB — same modal style as Edit */}
          {canManageWorkspace && activeTab === "create" ? (
            <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)]">

              {/* Gradient header */}
              <div className="bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-6 pb-5 pt-6">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.1rem] bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                    <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                      <path d="M12 5v14M5 12h14" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/70">New Account</p>
                    <h3 className="mt-0.5 text-xl font-semibold text-white">Add Team Member</h3>
                    <p className="mt-0.5 text-sm text-white/60">Fill in all tabs before submitting</p>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="mt-5 flex rounded-xl bg-white/15 p-1">
                  {(["account", "profile", "bank"] as const).map((sec) => (
                    <button
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                        createSection === sec ? "bg-white text-slate-900 shadow-sm" : "text-white/80 hover:text-white"
                      }`}
                      key={sec}
                      onClick={() => setCreateSection(sec)}
                      type="button"
                    >
                      {sec === "account" ? "Account" : sec === "profile" ? "Profile" : "Bank & ID"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form body */}
              <form action={createUserAction} autoComplete="off" className="px-6 py-5">
                <input autoComplete="username" className="hidden" name="fakeUsername" tabIndex={-1} type="text" />
                <input autoComplete="new-password" className="hidden" name="fakePassword" tabIndex={-1} type="password" />

                {userState.error ? <div className="mb-4"><Feedback>{userState.error}</Feedback></div> : null}
                {userState.success ? (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <svg className="shrink-0 text-emerald-600" fill="none" height="18" viewBox="0 0 24 24" width="18">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <p className="text-sm font-medium text-emerald-700">{userState.success}</p>
                  </div>
                ) : null}

                {/* Hidden passthrough fields for inactive tabs */}
                {createSection !== "profile" ? (
                  <>
                    <input name="employeeId" type="hidden" value="" />
                    <input name="department" type="hidden" value="" />
                    <input name="designation" type="hidden" value="" />
                    <input name="dateOfBirth" type="hidden" value="" />
                    <input name="address" type="hidden" value="" />
                    <input name="emergencyContact" type="hidden" value="" />
                  </>
                ) : null}
                {createSection !== "bank" ? (
                  <>
                    <input name="bankName" type="hidden" value="" />
                    <input name="bankAccountNumber" type="hidden" value="" />
                    <input name="bankIfscCode" type="hidden" value="" />
                    <input name="panNumber" type="hidden" value="" />
                  </>
                ) : null}

                {/* ACCOUNT tab */}
                {createSection === "account" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field defaultValue={userState.values?.fullName} label="Full Name" name="fullName" placeholder="Enter full name" />
                      <Field autoComplete="off" defaultValue={userState.values?.email} label="Email Address" name="email" placeholder="Enter email" type="email" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field defaultValue={userState.values?.phone} label="Phone" name="phone" placeholder="Enter phone number" />
                      <Field defaultValue={userState.values?.joiningDate} fallbackTodayForDate label="Joining Date" name="joiningDate" placeholder="Select joining date" type="date" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <SelectField defaultValue={userState.values?.role ?? "EMPLOYEE"} label="Role" labels={{ EMPLOYEE: "Employee", MANAGER: "Admin", SALES: "Sales" }} name="role" options={["EMPLOYEE", "MANAGER", "SALES"]} />
                      <SelectField defaultValue={userState.values?.status ?? "ACTIVE"} label="Status" name="status" options={["ACTIVE", "SUSPENDED"]} />
                      <SelectField defaultValue={userState.values?.techStack?.[0] ?? ""} includePlaceholder label="Tech Focus" name="techStack" options={salesTechnologyOptions} placeholder="No tech focus" />
                    </div>
                    <Field autoComplete="new-password" label="Temporary Password" name="password" placeholder="Min 8 chars, upper, lower, number, symbol" type="password" />
                    <FileField label="Onboarding Document (optional)" name="document" />
                  </div>
                ) : null}

                {/* PROFILE tab */}
                {createSection === "profile" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Employee ID" name="employeeId" placeholder="EMP-001" required={false} />
                      <Field label="Department" name="department" placeholder="e.g. Engineering" required={false} />
                      <Field label="Designation" name="designation" placeholder="e.g. Software Engineer" required={false} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Date of Birth" name="dateOfBirth" placeholder="Select date" required={false} type="date" />
                      <Field label="Emergency Contact" name="emergencyContact" placeholder="Name & phone" required={false} />
                    </div>
                    <Field label="Address" name="address" placeholder="Full residential address" required={false} />
                  </div>
                ) : null}

                {/* BANK & ID tab */}
                {createSection === "bank" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Bank Name" name="bankName" placeholder="e.g. HDFC Bank" required={false} />
                      <Field label="Account Number" name="bankAccountNumber" placeholder="Account number" required={false} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="IFSC Code" name="bankIfscCode" placeholder="HDFC0001234" required={false} />
                      <Field label="PAN Number" name="panNumber" placeholder="ABCDE1234F" required={false} />
                    </div>
                  </div>
                ) : null}

                <Button className="mt-6 w-full" disabled={userPending} type="submit">
                  {userPending ? "Creating Account…" : "Create Account"}
                </Button>
              </form>

              {/* Footer cancel */}
              <div className="border-t border-slate-100 px-6 py-4 text-right">
                <button
                  className="text-sm font-medium text-slate-400 transition hover:text-slate-700"
                  onClick={() => { setActiveTab("directory"); setCreateSection("account"); }}
                  type="button"
                >
                  Cancel — go back to directory
                </button>
              </div>
            </div>
          ) : null}

          {/* DIRECTORY TAB (also shown for readOnly) */}
          {(!canManageWorkspace || activeTab === "directory") ? (
            <div className="mt-5 space-y-5">
              {/* Search + filter row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" height="16" viewBox="0 0 24 24" width="16">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                    <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, email, role, tech..."
                    value={searchTerm}
                  />
                </div>
                <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-0.5">
                  {(["ALL", "EMPLOYEE", "MANAGER", "SALES"] as const).map((r) => (
                    <button
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${roleFilter === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      type="button"
                    >
                      {r === "ALL" ? "All" : r === "MANAGER" ? "Admin" : r.charAt(0) + r.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Employee row list */}
              {filteredUsers.length > 0 ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  {/* Table header */}
                  <div className="hidden grid-cols-[2fr_1.6fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:grid">
                    <span>Employee</span>
                    <span>Role &amp; Status</span>
                    <span>Contact</span>
                    <span className="w-24 text-right">Action</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <EmployeeRow
                        canEdit={canManageWorkspace}
                        key={user.id}
                        onEdit={() => {
                          setSelectedUserId(user.id);
                          setEditSection("account");
                          setIsEditModalOpen(true);
                        }}
                        user={user}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 py-14 text-center">
                  <p className="text-sm font-medium text-slate-400">No employees match your search or filter.</p>
                </div>
              )}

              {/* EDIT MODAL */}
              {canManageWorkspace && selectedUser && isEditModalOpen ? (
                <div
                  aria-modal="true"
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                  onClick={() => setIsEditModalOpen(false)}
                  role="dialog"
                >
                  <div
                    className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.28)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* ── Modal Header ── */}
                    <div className={`relative shrink-0 overflow-hidden px-6 pb-5 pt-6 ${getRoleGradient(selectedUser.role)}`}>
                      {/* Close × button */}
                      <button
                        aria-label="Close"
                        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                        onClick={() => setIsEditModalOpen(false)}
                        type="button"
                      >
                        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      </button>

                      {/* Avatar + identity */}
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/20 text-lg font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                          {getInitials(selectedUser.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/70">Editing Profile</p>
                          <h4 className="mt-0.5 truncate text-xl font-semibold text-white">{selectedUser.fullName}</h4>
                          <p className="mt-0.5 truncate text-sm text-white/70">
                            {selectedUser.designation || selectedUser.email}
                            {selectedUser.employeeId ? ` · ${selectedUser.employeeId}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Tab switcher inside header */}
                      <div className="mt-5 flex rounded-xl bg-white/15 p-1">
                        {(["account", "profile", "bank"] as const).map((sec) => (
                          <button
                            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                              editSection === sec
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-white/80 hover:text-white"
                            }`}
                            key={sec}
                            onClick={() => setEditSection(sec)}
                            type="button"
                          >
                            {sec === "account" ? "Account" : sec === "profile" ? "Profile" : "Bank & ID"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Scrollable form body ── */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {updateUserState.error ? (
                        <div className="px-6 pt-4"><Feedback>{updateUserState.error}</Feedback></div>
                      ) : null}
                      {updateUserState.success ? (
                        <div className="px-6 pt-4"><Feedback tone="success">{updateUserState.success}</Feedback></div>
                      ) : null}

                      <form action={updateUserAction} className="px-6 py-5">
                        <input name="userId" type="hidden" value={selectedUser.id} />

                        {/* Hidden passthrough fields */}
                        {editSection !== "account" ? (
                          <>
                            <input name="fullName" type="hidden" value={selectedUser.fullName} />
                            <input name="email" type="hidden" value={selectedUser.email} />
                            <input name="phone" type="hidden" value={selectedUser.phone} />
                            <input name="joiningDate" type="hidden" value={selectedUser.joiningDate} />
                            <input name="role" type="hidden" value={selectedUser.role} />
                            <input name="status" type="hidden" value={selectedUser.status} />
                            <input name="techStack" type="hidden" value={selectedUser.techStack[0] ?? ""} />
                          </>
                        ) : null}
                        {editSection !== "profile" ? (
                          <>
                            <input name="employeeId" type="hidden" value={selectedUser.employeeId} />
                            <input name="department" type="hidden" value={selectedUser.department} />
                            <input name="designation" type="hidden" value={selectedUser.designation} />
                            <input name="dateOfBirth" type="hidden" value={selectedUser.dateOfBirth} />
                            <input name="address" type="hidden" value={selectedUser.address} />
                            <input name="emergencyContact" type="hidden" value={selectedUser.emergencyContact} />
                          </>
                        ) : null}
                        {editSection !== "bank" ? (
                          <>
                            <input name="bankName" type="hidden" value={selectedUser.bankName} />
                            <input name="bankAccountNumber" type="hidden" value={selectedUser.bankAccountNumber} />
                            <input name="bankIfscCode" type="hidden" value={selectedUser.bankIfscCode} />
                            <input name="panNumber" type="hidden" value={selectedUser.panNumber} />
                          </>
                        ) : null}

                        {/* ACCOUNT */}
                        {editSection === "account" ? (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field defaultValue={selectedUser.fullName} label="Full Name" name="fullName" placeholder="Enter full name" />
                              <Field defaultValue={selectedUser.email} label="Email Address" name="email" placeholder="Enter email" type="email" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field defaultValue={selectedUser.phone} label="Phone" name="phone" placeholder="Enter phone number" />
                              <Field defaultValue={selectedUser.joiningDate} fallbackTodayForDate label="Joining Date" name="joiningDate" placeholder="Select joining date" type="date" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <SelectField defaultValue={selectedUser.role} label="Role" labels={{ EMPLOYEE: "Employee", MANAGER: "Admin", SALES: "Sales" }} name="role" options={["EMPLOYEE", "MANAGER", "SALES"]} />
                              <SelectField defaultValue={selectedUser.status} label="Status" name="status" options={["ACTIVE", "SUSPENDED"]} />
                              <SelectField defaultValue={selectedUser.techStack[0] ?? ""} includePlaceholder label="Tech Focus" name="techStack" options={salesTechnologyOptions} placeholder="No tech focus" />
                            </div>
                          </div>
                        ) : null}

                        {/* PROFILE */}
                        {editSection === "profile" ? (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                              <Field defaultValue={selectedUser.employeeId} label="Employee ID" name="employeeId" placeholder="EMP-001" required={false} />
                              <Field defaultValue={selectedUser.department} label="Department" name="department" placeholder="Engineering" required={false} />
                              <Field defaultValue={selectedUser.designation} label="Designation" name="designation" placeholder="Software Engineer" required={false} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field defaultValue={selectedUser.dateOfBirth} label="Date of Birth" name="dateOfBirth" placeholder="Select date" required={false} type="date" />
                              <Field defaultValue={selectedUser.emergencyContact} label="Emergency Contact" name="emergencyContact" placeholder="Name & phone" required={false} />
                            </div>
                            <Field defaultValue={selectedUser.address} label="Address" name="address" placeholder="Full residential address" required={false} />
                          </div>
                        ) : null}

                        {/* BANK */}
                        {editSection === "bank" ? (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field defaultValue={selectedUser.bankName} label="Bank Name" name="bankName" placeholder="e.g. HDFC Bank" required={false} />
                              <Field defaultValue={selectedUser.bankAccountNumber} label="Account Number" name="bankAccountNumber" placeholder="Account number" required={false} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field defaultValue={selectedUser.bankIfscCode} label="IFSC Code" name="bankIfscCode" placeholder="HDFC0001234" required={false} />
                              <Field defaultValue={selectedUser.panNumber} label="PAN Number" name="panNumber" placeholder="ABCDE1234F" required={false} />
                            </div>
                          </div>
                        ) : null}

                        {/* Save */}
                        <Button className="mt-6 w-full" disabled={updateUserPending} type="submit">
                          {updateUserPending ? "Saving Changes…" : "Save Changes"}
                        </Button>
                      </form>
                    </div>

                    {/* ── Footer — Delete ── */}
                    <div className="shrink-0 border-t border-slate-100 bg-rose-50/40 px-6 py-3">
                      <form action={deleteManagedUser} className="flex items-center justify-between gap-3">
                        <input name="userId" type="hidden" value={selectedUser.id} />
                        <div className="flex items-center gap-2">
                          <svg fill="none" height="14" viewBox="0 0 24 24" width="14" className="shrink-0 text-rose-400">
                            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
                          </svg>
                          <p className="text-xs text-rose-400">This will permanently delete the account.</p>
                        </div>
                        <FormActionButton
                          className="w-auto shrink-0 border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-none hover:border-rose-300 hover:bg-rose-600 hover:text-white"
                          pendingLabel="Deleting…"
                          type="submit"
                          variant="primary"
                        >
                          Delete
                        </FormActionButton>
                      </form>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Tech coverage summary (read-only view) */}
              {readOnly && techSummary.length > 0 ? (
                <div className="mt-2 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Tech Coverage</p>
                  <div className="flex flex-wrap gap-2">
                    {techSummary.map((item) => (
                      <span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-semibold text-blue-700" key={item.label}>
                        {item.label} <span className="text-slate-400">({item.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

        </section>
      ) : null}

      {shouldShowSalesTracker ? (
        <SalesWorkspacePanel
          canManageWorkspace={canManageWorkspace}
          salesLeadPriorityOptions={salesLeadPriorityOptions}
          salesLeadRows={salesLeadRows}
          salesLeadSourceOptions={salesLeadSourceOptions}
          salesLeadStatusOptions={salesLeadStatusOptions}
          salesOnly={salesOnly}
          salesOptions={salesOptions}
          salesTechnologyOptions={salesTechnologyOptions}
          salesWorkspace={salesWorkspace}
        />
      ) : null}


    </div>
  );
}

function getInitials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function getRoleGradient(role: string) {
  switch (role) {
    case "SUPER_ADMIN": return "bg-[linear-gradient(135deg,#7c3aed,#4f46e5)]";
    case "MANAGER": return "bg-[linear-gradient(135deg,#1d4ed8,#0284c7)]";
    case "SALES": return "bg-[linear-gradient(135deg,#d97706,#dc2626)]";
    default: return "bg-[linear-gradient(135deg,#059669,#0284c7)]";
  }
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "SUPER_ADMIN": return "border-violet-100 bg-violet-50 text-violet-700";
    case "MANAGER": return "border-blue-100 bg-blue-50 text-blue-700";
    case "SALES": return "border-amber-100 bg-amber-50 text-amber-700";
    default: return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
}

function EmployeeRow({
  canEdit,
  onEdit,
  user,
}: {
  canEdit: boolean;
  onEdit: () => void;
  user: EmployeeDirectoryEntry;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60 sm:grid sm:grid-cols-[2fr_1.6fr_1fr_auto] sm:gap-4 sm:px-5"
    >
      {/* Col 1 — Avatar + Name */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] text-xs font-bold text-white shadow-sm ${getRoleGradient(user.role)}`}>
          {getInitials(user.fullName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
          <p className="truncate text-xs text-slate-400">{user.designation || user.email}</p>
        </div>
      </div>

      {/* Col 2 — Role / Status / Tech */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${getRoleBadgeClass(user.role)}`}>
          {roleLabel(user.role)}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
          user.status === "ACTIVE" ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-rose-100 bg-rose-50 text-rose-600"
        }`}>
          {user.status}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${
          user.todayStatus === "Present"
            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
            : user.todayStatus === "On Leave"
              ? "border-amber-100 bg-amber-50 text-amber-700"
              : "border-rose-100 bg-rose-50 text-rose-600"
        }`}>
          {user.todayStatus}
        </span>
        {user.techStack.slice(0, 2).map((tech) => (
          <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-violet-700" key={tech}>
            {tech}
          </span>
        ))}
        {user.techStack.length > 2 ? (
          <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[0.62rem] font-semibold text-slate-400">
            +{user.techStack.length - 2}
          </span>
        ) : null}
      </div>

      {/* Col 3 — Contact */}
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-xs font-medium text-slate-600">{user.phone || "—"}</p>
        {user.joiningDate ? <p className="mt-0.5 text-xs text-slate-400">Joined {user.joiningDate}</p> : null}
      </div>

      {/* Col 4 — Action */}
      {canEdit ? (
        <button
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          onClick={onEdit}
          type="button"
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

function OverviewCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="rounded-[1.6rem] border border-slate-100 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blue-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

type FieldProps = {
  autoComplete?: string;
  defaultValue?: string;
  fallbackTodayForDate?: boolean;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
};

function Field({
  autoComplete,
  defaultValue,
  fallbackTodayForDate = false,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: FieldProps) {
  const resolvedDefaultValue = type === "date" && fallbackTodayForDate ? (defaultValue || getTodayDate()) : defaultValue;
  const resolvedRequired = required ?? (type !== "date" || name !== "joiningDate");

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 ${
          type === "date" ? "[color-scheme:light]" : ""
        }`}
        autoComplete={autoComplete}
        defaultValue={resolvedDefaultValue}
        name={name}
        placeholder={placeholder}
        required={resolvedRequired}
        type={type}
      />
    </label>
  );
}

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700"
        name={name}
        type="file"
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  includePlaceholder = false,
  label,
  labels,
  name,
  onChangeValue,
  options,
  placeholder = "Select option",
  required = false,
}: {
  defaultValue: string;
  includePlaceholder?: boolean;
  label: string;
  labels?: Record<string, string>;
  name: string;
  onChangeValue?: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        defaultValue={defaultValue}
        name={name}
        onChange={(event) => onChangeValue?.(event.target.value)}
        required={required}
      >
        {includePlaceholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildTechSummary(users: EmployeeDirectoryEntry[]) {
  const countMap = new Map<string, number>();

  for (const user of users) {
    for (const tech of user.techStack) {
      countMap.set(tech, (countMap.get(tech) ?? 0) + 1);
    }
  }

  return Array.from(countMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function roleLabel(role: EmployeeDirectoryEntry["role"]) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "MANAGER":
      return "Admin";
    case "EMPLOYEE":
      return "Employee";
    case "SALES":
      return "Sales";
  }
}
