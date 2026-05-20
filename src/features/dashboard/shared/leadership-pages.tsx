import "server-only";
import { notFound } from "next/navigation";
import { AttendancePanel } from "@/features/dashboard/components/attendance-panel";
import { DsrPanel } from "@/features/dashboard/components/dsr-panel";
import { EmployeesManagementPanel } from "@/features/dashboard/components/employees-management-panel";
import { LeavesPanel } from "@/features/dashboard/components/leaves-panel";
import { ProjectsPanel } from "@/features/dashboard/components/projects-panel";
import { ReportsPanel } from "@/features/dashboard/components/reports-panel";
import { SettingsPanel } from "@/features/dashboard/components/settings-panel";
import { TasksPanel } from "@/features/dashboard/components/tasks-panel";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import {
  getAttendancePageData,
  getDsrPageData,
  getEmployeesPageData,
  getLeavesPageData,
  getProjectsPageData,
  getReportsPageData,
  getSettingsPageData,
  getTasksPageData,
} from "@/features/dashboard/server/page-data";
import type { DashboardPageKey } from "@/features/dashboard/shared/page-types";

export async function renderLeadershipDashboardPage(page: DashboardPageKey, session: AuthenticatedSession) {

  switch (page) {
    case "employees": {
      const data = await getEmployeesPageData(session);
      return (
        <EmployeesManagementPanel
          readOnly={false}
          salesLeadPriorityOptions={data.salesLeadPriorityOptions}
          salesLeadSourceOptions={data.salesLeadSourceOptions}
          salesLeadStatusOptions={data.salesLeadStatusOptions}
          salesLeadRows={data.salesLeadRows}
          salesWorkspace={data.salesWorkspace}
          salesOptions={data.salesOptions}
          salesTechnologyOptions={data.salesTechnologyOptions}
          summaryCards={data.summaryCards}
          users={data.users}
        />
      );
    }
    case "attendance": {
      const data = await getAttendancePageData(session);
      return <AttendancePanel data={data} />;
    }
    case "projects": {
      const data = await getProjectsPageData(session);
      return <ProjectsPanel data={data} />;
    }
    case "leaves": {
      const data = await getLeavesPageData(session);
      return <LeavesPanel canApply={false} canReview data={data} />;
    }
    case "tasks": {
      const data = await getTasksPageData(session);
      return <TasksPanel canAssign data={data} readOnly={false} />;
    }
    case "dsr": {
      const data = await getDsrPageData(session);
      return <DsrPanel data={data} simplifiedReview={false} />;
    }
    case "reports": {
      const data = await getReportsPageData(session);
      return <ReportsPanel data={data} simplifiedView={false} />;
    }
    case "settings": {
      const data = await getSettingsPageData(session);
      return <SettingsPanel data={data} />;
    }
    default:
      notFound();
  }
}


