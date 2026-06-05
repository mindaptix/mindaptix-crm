import "server-only";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { LeaveRequestModel } from "@/database/mongodb/models/leave-request";
import { ProjectModel } from "@/database/mongodb/models/project";
import { TaskModel } from "@/database/mongodb/models/task";
import type { DashboardOverviewData } from "@/features/dashboard/types";
import { formatIndiaTimeKey } from "@/shared/lib/india-time";
import {
  buildOverviewCalendarItems,
  buildOverviewPerformanceRows,
  buildOverviewWeeklySummaryCards,
  formatLabel,
  getDashboardOverviewContext,
} from "@/features/dashboard/shared/overview-support";

export async function getEmployeeDashboardOverviewData(session: AuthenticatedSession): Promise<DashboardOverviewData> {
  const { notifications, today } = await getDashboardOverviewContext(session);
  const currentTime = getCurrentTimeKey();
  const [attendanceRow, pendingLeaves, openTasks, projectCount, dsrCount, taskRows] = await Promise.all([
    AttendanceModel.findOne({ userId: session.user.id, dateKey: today }).lean(),
    LeaveRequestModel.countDocuments({ userId: session.user.id, status: "PENDING" }),
    TaskModel.countDocuments({ assignedUserId: session.user.id, status: { $ne: "COMPLETED" } }),
    ProjectModel.countDocuments({ assignedUserIds: session.user.id }),
    DailyUpdateModel.countDocuments({ userId: session.user.id, workDate: today }),
    TaskModel.find({ assignedUserId: session.user.id }, { title: 1, dueDate: 1, status: 1, priority: 1 }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    title: "My Workspace",
    description: "Quick access to attendance, tasks, DSR, and leave without duplicate widgets.",
    priorityAlert:
      !dsrCount && currentTime >= "19:00"
        ? {
            title: "DSR pending after 7 PM",
            detail: "Your DSR for today has not been submitted yet. Please complete it before day close.",
            actionLabel: "Open DSR",
            actionUrl: "/dashboard/dsr",
          }
        : undefined,
    cards: [
      { label: "Attendance", value: attendanceRow ? formatLabel(attendanceRow.status) : "Not Marked", detail: "Your current attendance status for today." },
      { label: "Pending Leaves", value: String(pendingLeaves), detail: "Your leave requests waiting for review." },
      { label: "Open Tasks", value: String(openTasks), detail: "Assigned tasks still in progress." },
      { label: "Assigned Projects", value: String(projectCount), detail: "Projects currently linked to your account." },
      { label: "DSR Today", value: dsrCount ? "Submitted" : "Pending", detail: "Daily status report state for today." },
    ],
    notificationTitle: "Updates",
    notifications,
    weeklySummaryTitle: "Weekly Pulse",
    weeklySummaryCards: buildOverviewWeeklySummaryCards({
      attendanceRows: attendanceRow ? [attendanceRow] : [],
      dsrRows: dsrCount ? [{ userId: session.user.id, workDate: today }] : [],
      leaveRows: [],
      taskRows,
      activePeopleCount: 1,
    }),
    calendarTitle: "Upcoming",
    calendarItems: buildOverviewCalendarItems({
      leaves: [],
      tasks: taskRows.map((task) => ({ ...task, assignedUserId: session.user.id })),
      userMap: new Map([[session.user.id, { fullName: session.user.fullName, email: session.user.email }]]),
    }),
    performanceTitle: "My Score",
    performanceRows: await buildOverviewPerformanceRows([session.user.id]),
    primaryListTitle: "Active Work",
    primaryEmptyMessage: "No tasks assigned right now.",
    primaryItems: taskRows.map((row) => ({
      id: row._id.toString(),
      title: row.title,
      meta: `${formatLabel(row.status)} | ${formatLabel(row.priority ?? "MEDIUM")}`,
      description: `Due ${row.dueDate}`,
    })),
    secondaryListTitle: "Sidebar Shortcuts",
    secondaryEmptyMessage: "Shortcut links will appear here.",
    secondaryItems: [
      { id: "attendance", title: "Attendance", meta: "Daily", description: "Check in, check out, and review today." },
      { id: "dsr", title: "DSR", meta: "Daily", description: "Submit today's work and tomorrow's plan." },
      { id: "leave", title: "Leaves", meta: "As needed", description: "Apply or track leave requests." },
    ],
  };
}

function getCurrentTimeKey() {
  return formatIndiaTimeKey(new Date());
}



