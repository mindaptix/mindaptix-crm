import { renderDashboardRoute } from "@/features/dashboard/router";

export const metadata = { title: "All Documents" };

export default async function DashboardAllDocumentsPage() {
  return renderDashboardRoute("alldocs");
}
