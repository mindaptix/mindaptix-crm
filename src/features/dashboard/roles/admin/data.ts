import "server-only";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import type { DashboardDateFilter } from "@/features/dashboard/types";
import { buildLeadershipDashboardOverview } from "@/features/dashboard/shared/leadership-overview";

export async function getAdminDashboardOverviewData(session: AuthenticatedSession, filter?: DashboardDateFilter) {
  return buildLeadershipDashboardOverview(
    session,
    {
      title: "Super Admin Dashboard",
      description: "Read-only company overview for attendance, tasks, leave status, and reporting discipline across the business.",
    },
    filter,
  );
}


