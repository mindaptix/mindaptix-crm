import type { UserRole } from "@/features/auth/lib/rbac";

export type DashboardNavKey =
  | "dashboard"
  | "employees"
  | "projects"
  | "attendance"
  | "leaves"
  | "tasks"
  | "dsr"
  | "reports"
  | "payroll"
  | "expenses"
  | "announcements"
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
  { key: "employees", label: "Employees", href: "/dashboard/employees", allowedRoles: ["SUPER_ADMIN", "MANAGER", "SALES"] },
  { key: "projects", label: "Projects", href: "/dashboard/projects", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "attendance", label: "Attendance", href: "/dashboard/attendance", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "leaves", label: "Leaves", href: "/dashboard/leaves", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "tasks", label: "Tasks", href: "/dashboard/tasks", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "dsr", label: "DSR", href: "/dashboard/dsr", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "reports", label: "Reports", href: "/dashboard/reports", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "payroll", label: "Payroll", href: "/dashboard/payroll", allowedRoles: ["SUPER_ADMIN", "EMPLOYEE"] },
  { key: "expenses", label: "Expenses", href: "/dashboard/expenses", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE"] },
  { key: "announcements", label: "Announcements", href: "/dashboard/announcements", allowedRoles: ["SUPER_ADMIN", "MANAGER", "EMPLOYEE", "SALES"] },
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

