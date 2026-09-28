import "server-only";
import { taskDeadline, isTaskFinished } from "@/features/tasks/deadline";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { LeaveRequestModel } from "@/database/mongodb/models/leave-request";
import { ProjectModel } from "@/database/mongodb/models/project";
import { TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/workforce/user";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import type { DashboardOverviewData } from "@/features/dashboard/types";
import { formatIndiaTimeKey } from "@/shared/lib/india-time";
import { getWorkdayBreakdown, mergeCompanyHolidays } from "@/features/dashboard/lib/work-calendar";
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
  const monthPrefix = today.slice(0, 7);
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = new Date(`${monthStart}T00:00:00.000Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(0);
  const monthEndKey = monthEnd.toISOString().slice(0, 10);
  const [attendanceRow, pendingLeaves, openTasks, projectCount, dsrCount, taskRows, monthlyAttendance, monthlyDsrCount, monthlyHolidays] = await Promise.all([
    AttendanceModel.findOne({ userId: session.user.id, dateKey: today }).lean(),
    LeaveRequestModel.countDocuments({ userId: session.user.id, status: "PENDING" }),
    TaskModel.countDocuments({ assignedUserId: session.user.id, status: { $nin: ["COMPLETED", "CLOSED"] } }),
    ProjectModel.countDocuments({ assignedUserIds: session.user.id }),
    DailyUpdateModel.countDocuments({ userId: session.user.id, workDate: today }),
    TaskModel.find({ assignedUserId: session.user.id }, { title: 1, description: 1, dueDate: 1, deadlineAt: 1, status: 1, priority: 1, assignedByUserId: 1 }).sort({ dueDate: 1, deadlineAt: 1 }).lean(),
    AttendanceModel.find({ userId: session.user.id, dateKey: { $gte: monthStart, $lte: today } }, { dateKey: 1 }).lean(),
    DailyUpdateModel.countDocuments({ userId: session.user.id, workDate: { $gte: monthStart, $lte: today } }),
    HolidayModel.find({ date: { $gte: monthStart, $lte: monthEndKey } }, { date: 1 }).lean(),
  ]);
  const holidayDates = mergeCompanyHolidays(monthlyHolidays).map((holiday) => holiday.date);
  const workdaysThisMonth = getWorkdayBreakdown(monthStart, monthEndKey, holidayDates).workingDays;
  const workdaysSoFar = getWorkdayBreakdown(monthStart, today, holidayDates).workingDays;
  const presentDays = new Set(monthlyAttendance.map((record) => record.dateKey)).size;
  const absentDays = Math.max(workdaysSoFar - presentDays, 0);
  const creatorIds = Array.from(new Set(taskRows.map((task) => task.assignedByUserId).filter(Boolean)));
  const taskCreators = creatorIds.length
    ? await UserModel.find({ _id: { $in: creatorIds } }, { fullName: 1 }).lean()
    : [];
  const creatorNameById = new Map(taskCreators.map((user) => [user._id.toString(), user.fullName]));

  return {
    title: "My Workspace",
    assignedTasks: taskRows.filter((task) => !isTaskFinished(task.status)).map((task) => ({
      id: task._id.toString(), title: task.title, description: task.description,
      priority: task.priority, status: task.status, deadlineAt: taskDeadline(task)?.toISOString() ?? "",
      assignedByName: creatorNameById.get(task.assignedByUserId) ?? "Unknown",
      assignedBySelf: task.assignedByUserId === session.user.id,
    })).sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt)),
    description: "Quick access to attendance, tasks, DSR, and leave without duplicate widgets.",
    monthlyInsights: [
      { label: "Working days", value: String(workdaysThisMonth), detail: `${workdaysSoFar} working days completed so far this month.` },
      { label: "Present", value: String(presentDays), detail: `${absentDays} absent or not marked so far.` },
      { label: "DSR submitted", value: `${monthlyDsrCount} / ${workdaysSoFar}`, detail: `${Math.max(workdaysSoFar - monthlyDsrCount, 0)} DSR update${Math.max(workdaysSoFar - monthlyDsrCount, 0) === 1 ? "" : "s"} pending so far.` },
    ],
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
