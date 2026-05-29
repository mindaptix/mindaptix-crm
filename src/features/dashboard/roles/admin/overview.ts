import "server-only";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import type { DashboardDateFilter } from "@/features/dashboard/types";
import { getAdminDashboardOverviewData } from "@/features/dashboard/roles/admin/data";

export async function getAdminDashboardOverview(session: AuthenticatedSession, filter?: DashboardDateFilter) {
  return getAdminDashboardOverviewData(session, filter);
}


