import { renderLeadershipSection } from "@/features/dashboard/shared/render-leadership-section";

export const metadata = { title: "Project Portfolio" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; month?: string }> }) {
  return renderLeadershipSection("projects", searchParams);
}
