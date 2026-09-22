import { AdminDashboardOverview, EmployeeDashboardOverview } from "@/features/dashboard/components";
import { CurrentWorkDashboard } from "@/features/dashboard/components/current-work-dashboard";
import { getCurrentWork } from "@/features/dashboard/shared/current-work";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getEmployeeDashboardOverview } from "@/features/dashboard/roles";
import { getDisplayRoleLabel } from "@/features/dashboard/config";
import { DailyPlanner } from "@/features/tasks/components/daily-planner";
import { getDailyPlan } from "@/features/tasks/server/daily-plan";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER") {
    return <CurrentWorkDashboard work={await getCurrentWork(session)} />;
  }
  const overview = await getEmployeeDashboardOverview(session);
  if (session.user.role === "SALES") return <AdminDashboardOverview {...overview} />;
  const plan = await getDailyPlan(session.user.id, formatIndiaDateKey(new Date()));
  return <><div className="px-3 pb-4 sm:px-7"><DailyPlanner plan={plan} /></div><EmployeeDashboardOverview overview={overview} roleBadge={getDisplayRoleLabel(session.user.role)} /></>;
}
