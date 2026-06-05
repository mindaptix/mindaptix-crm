import { renderDashboardRoute } from "@/features/dashboard/router";

export const metadata = { title: "My Documents" };

export default async function DashboardDocumentsPage() {
  return renderDashboardRoute("documents");
}
