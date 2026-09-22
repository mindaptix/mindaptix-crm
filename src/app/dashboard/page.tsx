import { AdminDashboardOverview, EmployeeDashboardOverview } from "@/features/dashboard/components";
import { CurrentWorkDashboard } from "@/features/dashboard/components/current-work-dashboard";
import { getCurrentWork } from "@/features/dashboard/shared/current-work";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getEmployeeDashboardOverview } from "@/features/dashboard/roles";
import { getDisplayRoleLabel } from "@/features/dashboard/config";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER") {
    return <CurrentWorkDashboard work={await getCurrentWork(session)} />;
  }
  const overview = await getEmployeeDashboardOverview(session);
  if (session.user.role === "SALES") return <AdminDashboardOverview {...overview} />;
  return <EmployeeDashboardOverview overview={overview} roleBadge={getDisplayRoleLabel(session.user.role)} />;
}
