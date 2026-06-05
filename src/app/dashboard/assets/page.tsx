import { renderDashboardRoute } from "@/features/dashboard/router";

export const metadata = { title: "Assets" };

export default async function DashboardAssetsPage() {
  return renderDashboardRoute("assets");
}
