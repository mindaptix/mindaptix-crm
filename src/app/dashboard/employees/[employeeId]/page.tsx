import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getEmployeeDetailData } from "@/features/dashboard/data";
import { EmployeeDetailPanel } from "@/features/dashboard/components/employee-detail-panel";

export const metadata = { title: "Employee Profile" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const canView = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  if (!canView) redirect("/dashboard");

  const { employeeId } = await params;

  try {
    const data = await getEmployeeDetailData(session, employeeId);
    return <EmployeeDetailPanel data={data} />;
  } catch {
    notFound();
  }
}
