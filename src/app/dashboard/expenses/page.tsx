import { renderDashboardRoute } from "@/features/dashboard/router";

export default async function DashboardExpensesPage() {
  return renderDashboardRoute("expenses");
}
