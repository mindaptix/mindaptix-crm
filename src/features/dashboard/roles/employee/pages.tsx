import "server-only";
import { notFound } from "next/navigation";
import { AnnouncementsPanel } from "@/features/dashboard/components/announcements-panel";
import { AttendancePanel } from "@/features/dashboard/components/attendance-panel";
import { DsrPanel } from "@/features/dashboard/components/dsr-panel";
import { EmployeeProjectsPanel } from "@/features/dashboard/components/employee-projects-panel";
import { ExpensesPanel } from "@/features/dashboard/components/expenses-panel";
import { LeavesPanel } from "@/features/dashboard/components/leaves-panel";
import { PayrollPanel } from "@/features/dashboard/components/payroll-panel";
import { ReportsPanel } from "@/features/dashboard/components/reports-panel";
import { SettingsPanel } from "@/features/dashboard/components/settings-panel";
import { TasksPanel } from "@/features/dashboard/components/tasks-panel";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import {
  getAnnouncementsPageData,
  getAttendancePageData,
  getDsrPageData,
  getExpensesPageData,
  getLeavesPageData,
  getPayrollPageData,
  getProjectsPageData,
  getReportsPageData,
  getSettingsPageData,
  getTasksPageData,
} from "@/features/dashboard/server/page-data";
import type { DashboardPageKey } from "@/features/dashboard/shared/page-types";

export async function renderEmployeeDashboardPage(page: DashboardPageKey, session: AuthenticatedSession) {
  switch (page) {
    case "projects": {
      const data = await getProjectsPageData(session);
      return <EmployeeProjectsPanel data={data} />;
    }
    case "attendance": {
      const data = await getAttendancePageData(session);
      return <AttendancePanel data={data} />;
    }
    case "leaves": {
      const data = await getLeavesPageData(session);
      return <LeavesPanel canApply canReview={false} data={data} />;
    }
    case "tasks": {
      const data = await getTasksPageData(session);
      return <TasksPanel canAssign={false} readOnly={false} data={data} />;
    }
    case "dsr": {
      const data = await getDsrPageData(session);
      return <DsrPanel data={data} />;
    }
    case "reports": {
      const data = await getReportsPageData(session);
      return <ReportsPanel data={data} simplifiedView />;
    }
    case "expenses": {
      const data = await getExpensesPageData(session);
      return <ExpensesPanel data={data} />;
    }
    case "payroll": {
      const data = await getPayrollPageData(session);
      return <PayrollPanel data={data} canManage={false} />;
    }
    case "announcements": {
      const data = await getAnnouncementsPageData(session);
      return <AnnouncementsPanel data={data} />;
    }
    case "settings": {
      const data = await getSettingsPageData(session);
      return <SettingsPanel data={data} />;
    }
    default:
      notFound();
  }
}


