import { renderDashboardRoute } from "@/features/dashboard/router";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  return renderDashboardRoute("payments");
}
