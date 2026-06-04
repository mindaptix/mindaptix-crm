"use client";

import React from "react";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createManagedUser, deleteManagedUser, updateManagedUserAccess } from "@/features/dashboard/actions/users";
import { SalesWorkspacePanel } from "@/features/dashboard/components/sales-workspace-panel";
import { emitDashboardSync } from "@/features/dashboard/lib/live-sync";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import { INITIAL_USER_MANAGEMENT_STATE } from "@/features/auth/lib/user-management-form-state";
import type {
  EmployeeDirectoryEntry,
  EmployeeOption,
  SalesLeadEntry,
  SalesWorkspaceData,
  SummaryCard,
} from "@/features/dashboard/types";

// ── Tech categories for the picker ─────────────────────────────────────────
const TECH_CATEGORIES: Record<string, string[]> = {
  "📣 Digital Marketing": [
    "SEO", "Google Ads", "Meta Ads", "Email Marketing", "Content Marketing",
    "Social Media Marketing", "Influencer Marketing", "SMS Marketing",
    "WhatsApp Marketing", "YouTube Ads", "LinkedIn Ads", "Twitter / X Ads",
    "Affiliate Marketing", "Performance Marketing", "CRO", "Google Analytics",
    "Content", "Automation",
  ],
  "🌐 Website & CMS": [
    "WordPress", "Shopify", "Wix", "Webflow", "Elementor", "WooCommerce",
    "Magento", "BigCommerce", "Squarespace", "Drupal", "Joomla", "Custom Website",
  ],
  "🤖 AI & Automation": [
    "Claude AI", "ChatGPT", "OpenAI API", "Gemini AI", "LangChain",
    "AI Integration", "Hugging Face", "Stable Diffusion", "Midjourney",
    "AI Chatbot", "Machine Learning", "Zapier", "Make", "n8n", "Custom CRM",
  ],
  "⚛️ Frontend": [
    "React", "Next.js", "Vue.js", "Angular", "TypeScript", "JavaScript",
    "HTML / CSS", "Tailwind CSS", "Redux", "GraphQL",
  ],
  "🔧 Backend & DB": [
    "Node.js", "Python", "Django", "FastAPI", "PHP", "Laravel",
    "Java", "Spring Boot", "Go", "Rust", "MongoDB", "PostgreSQL",
    "MySQL", "Redis", "MERN",
  ],
  "📱 Mobile": [
    "Flutter", "React Native", "Swift", "Kotlin", "iOS", "Android",
  ],
  "🎨 Design": [
    "UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator",
  ],
  "☁️ Cloud & DevOps": [
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "DevOps", "CI/CD",
  ],
};

// ── Form-draft helpers for create-employee persistence ─────────────────────
const DRAFT_KEY = "mindaptix_create_employee_draft";

type CreateDraft = {
  fullName: string;
  email: string;
  phone: string;
  joiningDate: string;
  role: string;
  status: string;
  techStack: string[];
  // profile
  employeeId: string;
  department: string;
  designation: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  // bank
  bankName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  panNumber: string;
};

const DEFAULT_DRAFT: CreateDraft = {
  fullName: "", email: "", phone: "", joiningDate: getTodayDate(),
  role: "EMPLOYEE", status: "ACTIVE", techStack: [],
  employeeId: "", department: "", designation: "", dateOfBirth: "",
  address: "", emergencyContact: "",
  bankName: "", bankAccountNumber: "", bankIfscCode: "", panNumber: "",
};

function loadDraft(): CreateDraft {
  try {
    if (typeof window === "undefined") return DEFAULT_DRAFT;
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) return { ...DEFAULT_DRAFT, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_DRAFT;
}

function persistDraft(draft: CreateDraft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
}

function clearDraftStorage() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// ── Panel props ─────────────────────────────────────────────────────────────
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastUpdateSuccess, setLastUpdateSuccess] = useState<string | null>(null);
  const [techStackFilter, setTechStackFilter] = useState<string | null>(null);
  const techSummary = buildTechSummary(users);

  // ── Create-form draft state (persists across tab switches + page nav) ──
  const [createDraft, setCreateDraft] = useState<CreateDraft>(loadDraft);
  const [createFormKey, setCreateFormKey] = useState(0);  // bump to hard-reset form

  const updateDraft = useCallback((updates: Partial<CreateDraft>) => {
    setCreateDraft(prev => {
      const next = { ...prev, ...updates };
      persistDraft(next);
      return next;
    });
  }, []);

  const resetCreateDraft = useCallback(() => {
    clearDraftStorage();
    setCreateDraft(DEFAULT_DRAFT);
    setCreateFormKey(k => k + 1);
  }, []);

  // ── Edit modal: track tech stack separately so it survives tab switches ──
  const [editTechStack, setEditTechStack] = useState<string[]>([]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      if (techStackFilter && !user.techStack.includes(techStackFilter)) {
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
  }, [roleFilter, searchTerm, techStackFilter, users]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;
  const canManageWorkspace = !readOnly && !salesOnly;
  const shouldShowDirectory = !salesOnly;
  const shouldShowSalesTracker = salesOnly || salesOptions.length > 0 || salesLeadRows.length > 0;

  // When edit modal opens, seed editTechStack from selected user
  useEffect(() => {
    if (isEditModalOpen && selectedUser) {
      setEditTechStack([...selectedUser.techStack]);
    }
  }, [isEditModalOpen, selectedUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userState.success) {
      emitDashboardSync("user-created");
      resetCreateDraft();
    }
  }, [userState.success, resetCreateDraft]);

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
        setConfirmDelete(false);
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
    <div className="space-y-6 px-3 py-3 sm:px-7 sm:py-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <OverviewCard detail={card.detail} key={card.label} label={card.label} value={card.value} />
        ))}
      </section>

      {/* ── Tech Stack Overview ─────────────────────────────────────────── */}
      {techSummary.length > 0 && !salesOnly ? (
        <section
          className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.06)]"
        >
          {/* Header */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
            style={{ background: "linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}
          >
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-indigo-600">Workforce Skills</p>
              <h2 className="mt-0.5 text-xl font-bold text-slate-900">Tech Stack Overview</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {techSummary.length} skill{techSummary.length !== 1 ? "s" : ""} across {users.length} team member{users.length !== 1 ? "s" : ""}.
                {techStackFilter ? null : " Click any skill to filter employees."}
              </p>
            </div>
            {techStackFilter ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                onClick={() => setTechStackFilter(null)}
                type="button"
              >
                {techStackFilter} &times; Clear filter
              </button>
            ) : null}
          </div>

          <div className="p-6 space-y-5">
            {/* Skill tags with count badges */}
            <div className="flex flex-wrap gap-2">
              {techSummary.map((item) => {
                const isActive = techStackFilter === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => setTechStackFilter(isActive ? null : item.label)}
                    type="button"
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                      isActive
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold ${
                        isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* When a skill is selected — show matching employees */}
            {techStackFilter ? (
              <div>
                <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-indigo-600">
                  Employees with &ldquo;{techStackFilter}&rdquo; — {users.filter((u) => u.techStack.includes(techStackFilter)).length} found
                </p>
                <div className="flex flex-wrap gap-2">
                  {users
                    .filter((u) => u.techStack.includes(techStackFilter))
                    .map((u) => (
                      <Link
                        key={u.id}
                        href={`/dashboard/employees/${u.id}`}
                        className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                          style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}
                        >
                          {u.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </span>
                        <div>
                          <p className="leading-tight">{u.fullName}</p>
                          <p className="text-[0.65rem] font-normal text-slate-400">{u.designation || u.role}</p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ) : (
              /* Top-5 bar chart when no filter active */
              <div>
                <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-slate-400">Top Skills by Employee Count</p>
                <div className="space-y-2.5">
                  {techSummary.slice(0, 8).map((item) => {
                    const pct = Math.round((item.count / users.length) * 100);
                    const barColor =
                      pct >= 60 ? "#6366f1" : pct >= 30 ? "#10b981" : pct >= 15 ? "#f59e0b" : "#94a3b8";
                    return (
                      <button
                        key={item.label}
                        className="group flex w-full items-center gap-3 text-left"
                        onClick={() => setTechStackFilter(item.label)}
                        type="button"
                      >
                        <span className="w-28 shrink-0 truncate text-right text-xs font-semibold text-slate-600 group-hover:text-indigo-600">
                          {item.label}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500 group-hover:opacity-80"
                            style={{ width: `${Math.max(pct, 3)}%`, background: barColor }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-xs font-bold text-slate-500">{item.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

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

          {/* CREATE EMPLOYEE TAB — always in DOM when canManageWorkspace, hidden via CSS */}
          {canManageWorkspace ? (
            <div className={`mt-6 overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)] ${activeTab !== "create" ? "hidden" : ""}`}>

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

              {/* Form body — key resets the form on success */}
              <form action={createUserAction} autoComplete="off" className="px-6 py-5" key={createFormKey}>
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

                {/* Hidden passthrough for inactive tabs */}
                {createSection !== "profile" ? (
                  <>
                    <input name="employeeId" type="hidden" value={createDraft.employeeId} />
                    <input name="department" type="hidden" value={createDraft.department} />
                    <input name="designation" type="hidden" value={createDraft.designation} />
                    <input name="dateOfBirth" type="hidden" value={createDraft.dateOfBirth} />
                    <input name="address" type="hidden" value={createDraft.address} />
                    <input name="emergencyContact" type="hidden" value={createDraft.emergencyContact} />
                  </>
                ) : null}
                {createSection !== "bank" ? (
                  <>
                    <input name="bankName" type="hidden" value={createDraft.bankName} />
                    <input name="bankAccountNumber" type="hidden" value={createDraft.bankAccountNumber} />
                    <input name="bankIfscCode" type="hidden" value={createDraft.bankIfscCode} />
                    <input name="panNumber" type="hidden" value={createDraft.panNumber} />
                  </>
                ) : null}
                {/* Tech stack is always tracked in draft, hidden inputs when not on account tab */}
                {createSection !== "account" ? (
                  createDraft.techStack.map(tech => (
                    <input key={tech} name="techStack" type="hidden" value={tech} />
                  ))
                ) : null}

                {/* ACCOUNT tab */}
                {createSection === "account" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ControlledField
                        label="Full Name"
                        name="fullName"
                        placeholder="Enter full name"
                        value={createDraft.fullName}
                        onChangeValue={(v) => updateDraft({ fullName: v })}
                      />
                      <ControlledField
                        autoComplete="off"
                        label="Email Address"
                        name="email"
                        placeholder="Enter email"
                        type="email"
                        value={createDraft.email}
                        onChangeValue={(v) => updateDraft({ email: v })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ControlledField
                        label="Phone"
                        name="phone"
                        placeholder="Enter phone number"
                        value={createDraft.phone}
                        onChangeValue={(v) => updateDraft({ phone: v })}
                      />
                      <ControlledField
                        label="Joining Date"
                        name="joiningDate"
                        placeholder="Select joining date"
                        type="date"
                        value={createDraft.joiningDate}
                        onChangeValue={(v) => updateDraft({ joiningDate: v })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ControlledSelectField
                        label="Role"
                        name="role"
                        options={["EMPLOYEE", "MANAGER", "SALES"]}
                        labels={{ EMPLOYEE: "Employee", MANAGER: "Admin", SALES: "Sales" }}
                        value={createDraft.role}
                        onChangeValue={(v) => updateDraft({ role: v })}
                      />
                      <ControlledSelectField
                        label="Status"
                        name="status"
                        options={["ACTIVE", "SUSPENDED"]}
                        value={createDraft.status}
                        onChangeValue={(v) => updateDraft({ status: v })}
                      />
                    </div>
                    {/* Multi-select Tech Stack Picker */}
                    <TechStackPicker
                      label="Tech Focus / Skills"
                      options={salesTechnologyOptions}
                      value={createDraft.techStack}
                      onChangeValue={(techs) => updateDraft({ techStack: techs })}
                    />
                    <ControlledField
                      autoComplete="new-password"
                      label="Temporary Password"
                      name="password"
                      placeholder="Min 8 chars, upper, lower, number, symbol"
                      type="password"
                      value=""
                      onChangeValue={() => {}}
                      uncontrolled
                    />
                    <FileField label="Onboarding Document (optional)" name="document" />
                  </div>
                ) : null}

                {/* PROFILE tab */}
                {createSection === "profile" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <ControlledField
                        label="Employee ID"
                        name="employeeId"
                        placeholder="EMP-001"
                        value={createDraft.employeeId}
                        onChangeValue={(v) => updateDraft({ employeeId: v })}
                        required={false}
                      />
                      <ControlledField
                        label="Department"
                        name="department"
                        placeholder="e.g. Engineering"
                        value={createDraft.department}
                        onChangeValue={(v) => updateDraft({ department: v })}
                        required={false}
                      />
                      <ControlledField
                        label="Designation"
                        name="designation"
                        placeholder="e.g. Software Engineer"
                        value={createDraft.designation}
                        onChangeValue={(v) => updateDraft({ designation: v })}
                        required={false}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ControlledField
                        label="Date of Birth"
                        name="dateOfBirth"
                        placeholder="Select date"
                        type="date"
                        value={createDraft.dateOfBirth}
                        onChangeValue={(v) => updateDraft({ dateOfBirth: v })}
                        required={false}
                      />
                      <ControlledField
                        label="Emergency Contact"
                        name="emergencyContact"
                        placeholder="Name & phone"
                        value={createDraft.emergencyContact}
                        onChangeValue={(v) => updateDraft({ emergencyContact: v })}
                        required={false}
                      />
                    </div>
                    <ControlledField
                      label="Address"
                      name="address"
                      placeholder="Full residential address"
                      value={createDraft.address}
                      onChangeValue={(v) => updateDraft({ address: v })}
                      required={false}
                    />
                  </div>
                ) : null}

                {/* BANK & ID tab */}
                {createSection === "bank" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ControlledField
                        label="Bank Name"
                        name="bankName"
                        placeholder="e.g. HDFC Bank"
                        value={createDraft.bankName}
                        onChangeValue={(v) => updateDraft({ bankName: v })}
                        required={false}
                      />
                      <ControlledField
                        label="Account Number"
                        name="bankAccountNumber"
                        placeholder="Account number"
                        value={createDraft.bankAccountNumber}
                        onChangeValue={(v) => updateDraft({ bankAccountNumber: v })}
                        required={false}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ControlledField
                        label="IFSC Code"
                        name="bankIfscCode"
                        placeholder="HDFC0001234"
                        value={createDraft.bankIfscCode}
                        onChangeValue={(v) => updateDraft({ bankIfscCode: v })}
                        required={false}
                      />
                      <ControlledField
                        label="PAN Number"
                        name="panNumber"
                        placeholder="ABCDE1234F"
                        value={createDraft.panNumber}
                        onChangeValue={(v) => updateDraft({ panNumber: v })}
                        required={false}
                      />
                    </div>
                  </div>
                ) : null}

                <Button className="mt-6 w-full" disabled={userPending} type="submit">
                  {userPending ? "Creating Account…" : "Create Account"}
                </Button>
              </form>

              {/* Footer cancel */}
              <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
                <button
                  className="text-sm font-medium text-slate-400 transition hover:text-slate-700"
                  onClick={() => { setActiveTab("directory"); setCreateSection("account"); }}
                  type="button"
                >
                  ← Back to directory
                </button>
                <button
                  className="text-xs font-medium text-rose-300 transition hover:text-rose-600"
                  onClick={() => { resetCreateDraft(); setCreateSection("account"); }}
                  type="button"
                >
                  Clear form
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
                      {/* Top-right: Delete + Close buttons */}
                      <div className="absolute right-4 top-4 flex items-center gap-2">
                        {/* Delete with inline confirmation */}
                        {confirmDelete ? (
                          <div className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/30 px-3 py-1.5 backdrop-blur-sm">
                            <span className="text-[0.62rem] font-semibold text-white/90">Delete account?</span>
                            <form action={deleteManagedUser}>
                              <input name="userId" type="hidden" value={selectedUser.id} />
                              <button
                                className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[0.6rem] font-bold text-white transition hover:bg-rose-600"
                                type="submit"
                              >
                                Yes
                              </button>
                            </form>
                            <button
                              className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.6rem] font-bold text-white transition hover:bg-white/30"
                              onClick={() => setConfirmDelete(false)}
                              type="button"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            aria-label="Delete account"
                            className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-rose-500/70"
                            onClick={() => setConfirmDelete(true)}
                            title="Delete account"
                            type="button"
                          >
                            <svg fill="none" height="15" viewBox="0 0 24 24" width="15">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                            </svg>
                          </button>
                        )}
                        {/* Close × */}
                        <button
                          aria-label="Close"
                          className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                          onClick={() => { setIsEditModalOpen(false); setConfirmDelete(false); }}
                          type="button"
                        >
                          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                          </svg>
                        </button>
                      </div>

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
                            {/* Pass all selected techs as hidden inputs */}
                            {editTechStack.map(tech => (
                              <input key={tech} name="techStack" type="hidden" value={tech} />
                            ))}
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
                            <div className="grid gap-4 sm:grid-cols-2">
                              <SelectField defaultValue={selectedUser.role} label="Role" labels={{ EMPLOYEE: "Employee", MANAGER: "Admin", SALES: "Sales" }} name="role" options={["EMPLOYEE", "MANAGER", "SALES"]} />
                              <SelectField defaultValue={selectedUser.status} label="Status" name="status" options={["ACTIVE", "SUSPENDED"]} />
                            </div>
                            {/* Multi-select Tech Stack Picker for edit */}
                            <TechStackPicker
                              label="Tech Focus / Skills"
                              options={salesTechnologyOptions}
                              value={editTechStack}
                              onChangeValue={setEditTechStack}
                            />
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
        <div id="client-pitch-form">
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
        </div>
      ) : null}


    </div>
  );
}

// ── TechStackPicker ───────────────────────────────────────────────────────────
type TechStackPickerProps = {
  label?: string;
  options: string[];
  value: string[];
  onChangeValue: (techs: string[]) => void;
};

function TechStackPicker({ label = "Tech Focus / Skills", options, value, onChangeValue }: TechStackPickerProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const availableSet = new Set(options);

    if (!search.trim()) {
      return Object.entries(TECH_CATEGORIES)
        .map(([cat, techs]) => ({
          category: cat,
          techs: techs.filter(t => availableSet.has(t)),
        }))
        .filter(c => c.techs.length > 0);
    }

    const q = search.toLowerCase();
    const matched = options.filter(t => t.toLowerCase().includes(q));
    return matched.length > 0 ? [{ category: "🔍 Search Results", techs: matched }] : [];
  }, [search, options]);

  const toggle = (tech: string) => {
    const next = value.includes(tech)
      ? value.filter(t => t !== tech)
      : [...value, tech];
    onChangeValue(next);
  };

  const remove = (tech: string) => {
    onChangeValue(value.filter(t => t !== tech));
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>

      {/* Trigger area — shows selected chips */}
      <div
        className={`min-h-[46px] w-full cursor-pointer rounded-2xl border bg-white px-3 py-2 transition ${
          isOpen ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => setIsOpen(o => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsOpen(o => !o); } }}
      >
        {value.length === 0 ? (
          <div className="flex items-center gap-2 py-0.5">
            <svg fill="none" height="14" viewBox="0 0 24 24" width="14" className="text-slate-400">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
            </svg>
            <span className="text-sm text-slate-400">Click to add tech skills…</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {value.map(tech => (
              <span
                key={tech}
                className="flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700"
              >
                {tech}
                <button
                  aria-label={`Remove ${tech}`}
                  className="ml-0.5 rounded-full p-0.5 transition hover:bg-violet-200"
                  onClick={(e) => { e.stopPropagation(); remove(tech); }}
                  type="button"
                >
                  <svg fill="none" height="9" viewBox="0 0 24 24" width="9">
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </button>
              </span>
            ))}
            <span className="flex items-center py-0.5 text-xs text-slate-400">
              {isOpen ? "▲" : "▼"}
            </span>
          </div>
        )}
      </div>

      {/* Count badge */}
      {value.length > 0 ? (
        <span className="absolute right-3 top-0 -translate-y-1/2 rounded-full bg-violet-600 px-2 py-0.5 text-[0.6rem] font-bold text-white">
          {value.length}
        </span>
      ) : null}

      {/* Dropdown */}
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)]">
          {/* Search bar */}
          <div className="sticky top-0 border-b border-slate-100 bg-white px-3 pt-3 pb-2">
            <input
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              onClick={e => e.stopPropagation()}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tech skills..."
              value={search}
            />
          </div>

          {/* Categories + options */}
          <div className="max-h-52 overflow-y-auto p-2">
            {filteredCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No tech found matching &ldquo;{search}&rdquo;</p>
            ) : (
              filteredCategories.map(({ category, techs }) => (
                <div key={category} className="mb-3 last:mb-0">
                  <p className="mb-1.5 px-2 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-400">{category}</p>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {techs.map(tech => {
                      const selected = value.includes(tech);
                      return (
                        <button
                          key={tech}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                            selected
                              ? "border-violet-300 bg-violet-100 text-violet-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          }`}
                          onClick={(e) => { e.stopPropagation(); toggle(tech); }}
                          type="button"
                        >
                          {selected ? "✓ " : ""}{tech}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <span className="text-xs text-slate-400">{value.length} selected</span>
            {value.length > 0 ? (
              <button
                className="text-xs font-medium text-rose-400 transition hover:text-rose-600"
                onClick={(e) => { e.stopPropagation(); onChangeValue([]); }}
                type="button"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

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

      {/* Col 4 — Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          href={`/dashboard/employees/${user.id}`}
        >
          View
        </Link>
        {canEdit ? (
          <button
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onEdit}
            type="button"
          >
            Edit
          </button>
        ) : null}
      </div>
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

// ── Controlled Field (for create form with draft persistence) ─────────────────
type ControlledFieldProps = {
  autoComplete?: string;
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChangeValue: (v: string) => void;
  required?: boolean;
  type?: string;
  uncontrolled?: boolean; // for password — not persisted
};

function ControlledField({
  autoComplete,
  label,
  name,
  placeholder,
  value,
  onChangeValue,
  required,
  type = "text",
  uncontrolled = false,
}: ControlledFieldProps) {
  const resolvedRequired = required ?? true;

  if (uncontrolled) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
        <input
          autoComplete={autoComplete}
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 ${
            type === "date" ? "[color-scheme:light]" : ""
          }`}
          name={name}
          placeholder={placeholder}
          required={resolvedRequired}
          type={type}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        autoComplete={autoComplete}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 ${
          type === "date" ? "[color-scheme:light]" : ""
        }`}
        name={name}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={placeholder}
        required={resolvedRequired}
        type={type}
        value={value}
      />
    </label>
  );
}

// ── Controlled SelectField (for create form) ──────────────────────────────────
type ControlledSelectFieldProps = {
  label: string;
  name: string;
  options: string[];
  labels?: Record<string, string>;
  value: string;
  onChangeValue: (v: string) => void;
};

function ControlledSelectField({ label, name, options, labels, value, onChangeValue }: ControlledSelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        name={name}
        onChange={(e) => onChangeValue(e.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Original (uncontrolled) Field — used by edit modal ───────────────────────
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
