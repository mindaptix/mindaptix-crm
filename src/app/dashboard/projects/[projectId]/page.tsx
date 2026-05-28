import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getProjectDetailData } from "@/features/dashboard/data";
import { ProjectDetailPanel } from "@/features/dashboard/components/project-detail-panel";

export const metadata = { title: "Project Details" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const canView = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  if (!canView) redirect("/dashboard");

  const { projectId } = await params;

  try {
    const data = await getProjectDetailData(session, projectId);
    return <ProjectDetailPanel data={data} />;
  } catch {
    notFound();
  }
}
