import type { UserRole } from "@/features/auth/lib/rbac";

export type DashboardNavKey =
  | "dashboard"
  | "employees"
  | "projects"
  | "portfolio"
  | "client-pitches"
  | "meetings"
  | "attendance"
  | "leaves"
  | "tasks"
  | "dsr"
  | "reports"
  | "payroll"
  | "expenses"
  | "payments"
  | "assets"
  | "regularize"
  | "documents"
  | "alldocs"
  | "announcements"
  | "holidays"
  | "settings";

export type DashboardNavItem = {
  key: DashboardNavKey;
  label: string;
  href: string;
  allowedRoles?: readonly UserRole[];
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"],
  },
  { key: "employees", label: "Employee Management", href: "/dashboard/employees", allowedRoles: ["SUPER_ADMIN", "MANAGER", "SALES"] },
  { key: "portfolio", label: "Project Portfolio", href: "/dashboard/portfolio", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "client-pitches", label: "Client Pitch Tracker", href: "/dashboard/client-pitches", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "meetings", label: "Meetings", href: "/dashboard/meetings", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "projects", label: "Projects", href: "/dashboard/projects", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "attendance", label: "Attendance", href: "/dashboard/attendance", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"] },
  { key: "leaves", label: "Leaves", href: "/dashboard/leaves", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "tasks", label: "Tasks", href: "/dashboard/tasks", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"] },
  { key: "dsr", label: "DSR", href: "/dashboard/dsr", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "reports", label: "Reports", href: "/dashboard/reports", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "payroll", label: "Payroll", href: "/dashboard/payroll", allowedRoles: ["SUPER_ADMIN", "EMPLOYEE"] },
  { key: "expenses", label: "Expenses", href: "/dashboard/expenses", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "payments", label: "Payments", href: "/dashboard/payments", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "assets", label: "Assets", href: "/dashboard/assets", allowedRoles: ["SUPER_ADMIN", "MANAGER", "SALES"] },
  { key: "regularize", label: "Regularize", href: "/dashboard/regularize", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "documents", label: "My Documents", href: "/dashboard/documents", allowedRoles: ["EMPLOYEE", "SALES"] },
  { key: "alldocs", label: "All Documents", href: "/dashboard/alldocs", allowedRoles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "announcements", label: "Announcements", href: "/dashboard/announcements", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"] },
  { key: "holidays", label: "Holidays", href: "/dashboard/holidays", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"] },
  { key: "settings", label: "Settings", href: "/dashboard/settings", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"] },
];

export function getDashboardNavItemsForRole(role: UserRole) {
  return DASHBOARD_NAV_ITEMS.filter((item) => !item.allowedRoles || item.allowedRoles.includes(role));
}

export function getDefaultDashboardHrefForRole(role: UserRole) {
  void role;
  return "/dashboard";
}

export function getDisplayRoleLabel(role: UserRole) {
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
