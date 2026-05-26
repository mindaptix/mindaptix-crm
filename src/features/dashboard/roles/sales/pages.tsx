import "server-only";
import { notFound } from "next/navigation";
import { AnnouncementsPanel } from "@/features/dashboard/components/announcements-panel";
import { EmployeesManagementPanel } from "@/features/dashboard/components/employees-management-panel";
import { ExpensesPanel } from "@/features/dashboard/components/expenses-panel";
import { SettingsPanel } from "@/features/dashboard/components/settings-panel";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { getAnnouncementsPageData, getEmployeesPageData, getExpensesPageData, getSettingsPageData } from "@/features/dashboard/server/page-data";
import type { DashboardPageKey } from "@/features/dashboard/shared/page-types";

export async function renderSalesDashboardPage(page: DashboardPageKey, session: AuthenticatedSession) {
  switch (page) {
    case "employees": {
      const data = await getEmployeesPageData(session);
      return (
        <EmployeesManagementPanel
          salesLeadPriorityOptions={data.salesLeadPriorityOptions}
          salesLeadSourceOptions={data.salesLeadSourceOptions}
          salesLeadStatusOptions={data.salesLeadStatusOptions}
          salesLeadRows={data.salesLeadRows}
          salesWorkspace={data.salesWorkspace}
          salesOnly
          salesOptions={data.salesOptions}
          salesTechnologyOptions={data.salesTechnologyOptions}
          summaryCards={data.summaryCards}
          users={data.users}
        />
      );
    }
    case "expenses": {
      const data = await getExpensesPageData(session);
      return <ExpensesPanel data={data} />;
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
