import "server-only";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getAdminDashboardOverview, getManagerDashboardOverview } from "@/features/dashboard/roles";
import { AdminDashboardOverview } from "@/features/dashboard/components/admin-dashboard-overview";
import type { DashboardDateFilter } from "@/features/dashboard/types";

export async function renderLeadershipSection(sectionId: string, searchParams: Promise<{ date?: string; month?: string }>) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") redirect("/dashboard");
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;
  const month = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : undefined;
  const filter: DashboardDateFilter = date ? { type: "date", value: date } : month ? { type: "month", value: month } : null;
  const overview = await (session.user.role === "SUPER_ADMIN" ? getAdminDashboardOverview(session, filter) : getManagerDashboardOverview(session, filter));
  return <AdminDashboardOverview {...overview} executiveSections={overview.executiveSections?.filter((section) => section.id === sectionId)} filterDate={date} filterMonth={month} unreadAssignments={[]} />;
}
