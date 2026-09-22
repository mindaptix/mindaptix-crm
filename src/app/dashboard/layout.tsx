import { redirect } from "next/navigation";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { UserModel } from "@/database/mongodb/models/user";
import { EmployeeSessionSwitcher } from "@/features/auth/components/employee-session-switcher";
import { DsrChatbot } from "@/features/admin-assistant/components/dsr-chatbot";
import { AnnouncementPopup } from "@/features/dashboard/components/announcement-popup";
import { AnnouncementModel } from "@/database/mongodb/models/system/announcement";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const today = formatIndiaDateKey();
  const [employees, announcements] = await Promise.all([
    session.user.role === "SUPER_ADMIN" ? UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { fullName: 1 }).sort({ fullName: 1 }).lean() : [],
    AnnouncementModel.find({ $or: [{ expiresAt: null }, { expiresAt: { $gte: today } }] }, { title: 1, body: 1, type: 1, expiresAt: 1, targetRoles: 1 }).sort({ isPinned: -1, createdAt: -1 }).limit(10).lean(),
  ]);
  const visibleAnnouncements = announcements.filter((announcement) => !announcement.targetRoles?.length || announcement.targetRoles.includes(session.user.role)).map((announcement) => ({ id: String(announcement._id), title: announcement.title, body: announcement.body, type: announcement.type, expiresAt: announcement.expiresAt ?? "" }));
  return <DashboardShell session={session} announcementPopup={<AnnouncementPopup announcements={visibleAnnouncements} dateKey={today} userId={session.user.id} />} adminAssistant={session.user.role === "SUPER_ADMIN" ? <DsrChatbot /> : null} employeeSessionControl={<EmployeeSessionSwitcher placement="sidebar" session={session} employees={employees.map((employee) => ({ id: String(employee._id), name: employee.fullName }))} />}>{children}</DashboardShell>;
}
