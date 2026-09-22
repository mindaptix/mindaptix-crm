import { redirect } from "next/navigation";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { UserModel } from "@/database/mongodb/models/user";
import { EmployeeSessionSwitcher } from "@/features/auth/components/employee-session-switcher";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const employees = session.user.role === "SUPER_ADMIN" ? await UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { fullName: 1 }).sort({ fullName: 1 }).lean() : [];
  return <DashboardShell session={session}><EmployeeSessionSwitcher session={session} employees={employees.map((employee) => ({ id: String(employee._id), name: employee.fullName }))} />{children}</DashboardShell>;
}

