import "server-only";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import type { DashboardDateFilter } from "@/features/dashboard/types";
import { getManagerDashboardOverviewData } from "@/features/dashboard/roles/manager/data";

export async function getManagerDashboardOverview(session: AuthenticatedSession, filter?: DashboardDateFilter) {
  return getManagerDashboardOverviewData(session, filter);
}


