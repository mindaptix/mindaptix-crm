import { renderDashboardRoute } from "@/features/dashboard/router";

export const metadata = { title: "Attendance Regularization" };

export default async function DashboardRegularizePage() {
  return renderDashboardRoute("regularize");
}
