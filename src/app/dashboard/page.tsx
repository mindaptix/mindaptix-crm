import { AdminDashboardOverview, EmployeeDashboardOverview } from "@/features/dashboard/components";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getAdminDashboardOverview, getEmployeeDashboardOverview, getManagerDashboardOverview } from "@/features/dashboard/roles";
import { getDisplayRoleLabel } from "@/features/dashboard/config";
import { getPaymentsPageData } from "@/features/dashboard/data";
import type { DashboardDateFilter } from "@/features/dashboard/types";

// YYYY-MM-DD regex
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// YYYY-MM regex
const MONTH_RE = /^\d{4}-\d{2}$/;

function parseFilter(params: { date?: string; month?: string }): DashboardDateFilter {
  if (params.date && DATE_RE.test(params.date)) {
    return { type: "date", value: params.date };
  }
  if (params.month && MONTH_RE.test(params.month)) {
    return { type: "month", value: params.month };
  }
  return null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const params = await searchParams;
  const filter = parseFilter(params);

  const isLeadership = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  const [overview, paymentsData] = await Promise.all([
    session.user.role === "SUPER_ADMIN"
      ? getAdminDashboardOverview(session, filter)
      : session.user.role === "MANAGER"
        ? getManagerDashboardOverview(session, filter)
        : getEmployeeDashboardOverview(session),
    isLeadership ? getPaymentsPageData(session) : Promise.resolve(null),
  ]);

  if (session.user.role === "EMPLOYEE") {
    return <EmployeeDashboardOverview overview={overview} roleBadge={getDisplayRoleLabel(session.user.role)} />;
  }

  return (
    <AdminDashboardOverview
      paymentsData={paymentsData ?? undefined}
      attendanceBreakdown={overview.attendanceBreakdown}
      attendanceTrend={overview.attendanceTrend}
      calendarItems={overview.calendarItems}
      calendarTitle={overview.calendarTitle}
      description={overview.description}
      directoryEmptyMessage={overview.directoryEmptyMessage}
      directoryItems={overview.directoryItems}
      directoryTitle={overview.directoryTitle}
      dsrTrend={overview.dsrTrend}
      employeeProjectRows={overview.employeeProjectRows}
      executiveSections={overview.executiveSections}
      filterDate={params.date}
      filterLabel={overview.filterLabel}
      filterMonth={params.month}
      financeNote={overview.financeNote}
      leaveTrend={overview.leaveTrend}
      notificationTitle={overview.notificationTitle}
      notifications={overview.notifications}
      performanceRows={overview.performanceRows}
      performanceTitle={overview.performanceTitle}
      primaryEmptyMessage={overview.primaryEmptyMessage}
      primaryItems={overview.primaryItems}
      primaryListTitle={overview.primaryListTitle}
      projectStatusBreakdown={overview.projectStatusBreakdown}
      roleBadge={getDisplayRoleLabel(session.user.role)}
      secondaryEmptyMessage={overview.secondaryEmptyMessage}
      secondaryItems={overview.secondaryItems}
      secondaryListTitle={overview.secondaryListTitle}
      taskStatusBreakdown={overview.taskStatusBreakdown}
      title={overview.title}
      unreadAssignments={overview.unreadAssignments}
      weeklySummaryCards={overview.weeklySummaryCards}
      weeklySummaryTitle={overview.weeklySummaryTitle}
    />
  );
}
