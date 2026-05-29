import "server-only";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { getVisibleUserIdsForSession } from "@/features/dashboard/team-scope";
import { syncWorkflowNotifications, getNotificationsForUser, getUnreadAssignmentsForUser } from "@/features/notifications/service";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { LeaveRequestModel } from "@/database/mongodb/models/leave-request";
import { ProjectModel } from "@/database/mongodb/models/project";
import { SalesCustomerModel } from "@/database/mongodb/models/sales-customer";
import { SalesDealModel } from "@/database/mongodb/models/sales-deal";
import { SalesFollowUpModel } from "@/database/mongodb/models/sales-follow-up";
import {
  SALES_LEAD_PRIORITIES,
  SALES_LEAD_SOURCES,
  SALES_LEAD_STATUSES,
  SALES_TECH_OPTIONS,
  SalesLeadModel,
} from "@/database/mongodb/models/sales-lead";
import { SalesPaymentModel } from "@/database/mongodb/models/sales-payment";
import { SalesTargetModel } from "@/database/mongodb/models/sales-target";
import { SettingModel } from "@/database/mongodb/models/setting";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { AnnouncementModel } from "@/database/mongodb/models/system/announcement";
import { SalaryModel } from "@/database/mongodb/models/workforce/salary";
import { PayslipModel } from "@/database/mongodb/models/workforce/payslip";
import { ExpenseModel } from "@/database/mongodb/models/workforce/expense";
import { LeaveBalanceModel } from "@/database/mongodb/models/workforce/leave-balance";
import { TASK_LABELS, TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import { formatIndiaDateKey, formatIndiaDateTime, formatIndiaTimeKey } from "@/shared/lib/india-time";
import type {
  AnnouncementsPageData,
  AttendanceMonthlyRow,
  AttendancePageData,
  ClientPaymentEntry,
  DashboardBreakdownSlice,
  DashboardOverviewData,
  DsrPageData,
  EmployeeDetailAttendance,
  EmployeeDetailData,
  EmployeeDetailLeaveEntry,
  EmployeeDetailPayslip,
  EmployeeDetailProjectEntry,
  EmployeeDetailSalary,
  EmployeeDirectoryEntry,
  EmployeesPageData,
  ProjectDetailData,
  ProjectDetailEmployeeEntry,
  ProjectDetailPaymentEntry,
  ExpensePageData,
  LeaveBalanceEntry,
  LeaveEmployeeSummary,
  LeavePageData,
  PaymentsPageData,
  PayrollPageData,
  PerformanceScoreRow,
  ProjectsPageData,
  ReportsPageData,
  SalesCustomerEntry,
  SalesDealEntry,
  SalesFollowUpEntry,
  SalesLeadEntry,
  SalesPaymentEntry,
  SalesTargetEntry,
  SalesWorkspaceData,
  SettingsPageData,
  TaskPageData,
} from "@/features/dashboard/types";

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readNumberLike(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  }

  return undefined;
}

export type {
  AttendanceMonthlyRow,
  AttendancePageData,
  AttendanceRecordView,
  AttendanceTrendPoint,
  CalendarEventItem,
  DashboardBreakdownSlice,
  DashboardListItem,
  DashboardNotificationItem,
  DashboardOverviewData,
  DsrFeedEntry,
  DsrMissingEntry,
  DsrPageData,
  DsrTrendPoint,
  EmployeeDirectoryEntry,
  EmployeeOption,
  EmployeeProjectEntry,
  EmployeeProjectSummaryRow,
  EmployeeProjectView,
  EmployeeUpdateView,
  ExecutiveOverviewSection,
  EmployeesPageData,
  FileAttachmentView,
  LeaveEmployeeSummary,
  LeaveEntry,
  LeavePageData,
  LeaveTrendPoint,
  PerformanceScoreRow,
  ClientPaymentEntry,
  PaymentsPageData,
  ProjectsPageData,
  ReportsPageData,
  SalesCustomerEntry,
  SalesDealEntry,
  SalesFollowUpEntry,
  SalesLeadEntry,
  SalesPaymentEntry,
  SalesTargetEntry,
  SalesWorkspaceData,
  SettingsPageData,
  SummaryCard,
  TaskCommentView,
  TaskEntry,
  TaskPageData,
} from "@/features/dashboard/types";

export async function getDashboardOverviewData(session: AuthenticatedSession): Promise<DashboardOverviewData> {
  await connectDb();
  await syncWorkflowNotifications(session);

  const today = getTodayDate();
  const weekStart = addDaysToDate(today, -6);
  const notifications = mapNotifications(await getNotificationsForUser(session.user.id, 8));

  if (session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER") {
    const activeEmployees = await UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { fullName: 1, email: 1, phone: 1, joiningDate: 1 })
      .sort({ fullName: 1 })
      .lean();
    const employeeIds = activeEmployees.map((employee) => employee._id.toString());
    const employeeMap = new Map(
      activeEmployees.map((employee) => [employee._id.toString(), { fullName: employee.fullName, email: employee.email }]),
    );
    const scope = inScope(employeeIds);
    const [todaysAttendance, leaveRows, taskRows, weekAttendance, weekUpdates, projects] = await Promise.all([
      AttendanceModel.find({ userId: scope, dateKey: today }, { userId: 1 }).lean(),
      LeaveRequestModel.find({ userId: scope }, { userId: 1, leaveType: 1, startDate: 1, endDate: 1, status: 1, reason: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
      TaskModel.find({ assignedUserId: scope }, { title: 1, dueDate: 1, status: 1, assignedUserId: 1, priority: 1, completedAt: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
      AttendanceModel.find({ userId: scope, dateKey: { $gte: weekStart, $lte: today } }, { userId: 1, status: 1, dateKey: 1 }).lean(),
      DailyUpdateModel.find({ userId: scope, workDate: { $gte: weekStart, $lte: today } }, { userId: 1, workDate: 1 }).lean(),
      ProjectModel.find({}, { name: 1, status: 1, assignedUserIds: 1 }).sort({ createdAt: -1 }).lean(),
    ]);
    const presentTodayIds = new Set(todaysAttendance.map((row) => row.userId));
    const onLeaveTodayIds = new Set(
      leaveRows
        .filter((leave) => leave.status === "APPROVED" && leave.startDate <= today && leave.endDate >= today)
        .map((leave) => leave.userId),
    );
    const presentToday = presentTodayIds.size;
    const onLeaveToday = Array.from(onLeaveTodayIds).filter((userId) => !presentTodayIds.has(userId)).length;
    const absentToday = Math.max(activeEmployees.length - presentToday - onLeaveToday, 0);
    const todayLeaveRows = leaveRows.filter((leave) => leave.status === "APPROVED" && leave.startDate <= today && leave.endDate >= today);
    const currentWindowLeaveRows = leaveRows.filter((leave) => leave.endDate >= weekStart && leave.startDate <= today);
    const currentWindowTaskRows = taskRows.filter((task) => !task.createdAt || formatDate(task.createdAt) >= weekStart);
    const pendingProjects = projects.filter((project) => project.status === "PLANNING" || project.status === "ON_HOLD").length;
    const inProgressProjects = projects.filter((project) => project.status === "IN_PROGRESS").length;
    const completedProjects = projects.filter((project) => project.status === "COMPLETED").length;
    const attendanceBreakdown: DashboardBreakdownSlice[] = [
      { label: "Present", value: presentToday, color: "#2563eb" },
      { label: "On Leave", value: onLeaveToday, color: "#f59e0b" },
      { label: "Absent", value: absentToday, color: "#ef4444" },
    ];
    const taskStatusBreakdown: DashboardBreakdownSlice[] = [
      { label: "Pending", value: taskRows.filter((task) => task.status === "PENDING").length, color: "#f59e0b" },
      { label: "In Progress", value: taskRows.filter((task) => task.status === "IN_PROGRESS").length, color: "#3b82f6" },
      { label: "Completed", value: taskRows.filter((task) => task.status === "COMPLETED").length, color: "#10b981" },
    ];
    const projectStatusBreakdown: DashboardBreakdownSlice[] = [
      { label: "Pending", value: pendingProjects, color: "#f97316" },
      { label: "In Progress", value: inProgressProjects, color: "#2563eb" },
      { label: "Completed", value: completedProjects, color: "#10b981" },
    ];
    const attendanceTrend = buildAttendanceTrend({ activeEmployeeIds: employeeIds, attendanceRows: weekAttendance, leaveRows, today, weekStart });
    const leaveTrend = buildLeaveTrend(leaveRows, today, 6);
    const dsrTrend = buildDsrTrend({ activeEmployeeIds: employeeIds, dsrRows: weekUpdates, today, weekStart });
    const employeeProjectRows = buildEmployeeProjectSummaryRows({
      activeEmployees,
      projects: projects.map((project) => ({
        assignedUserIds: project.assignedUserIds ?? [],
        status: project.status,
      })),
    });

    return {
      title: session.user.role === "SUPER_ADMIN" ? "Super Admin Dashboard" : "Admin Dashboard",
      description:
        session.user.role === "SUPER_ADMIN"
          ? "Read-only company overview for attendance, tasks, leave status, and reporting discipline across the business."
          : "Admin control center for employee operations, task movement, leave approvals, and daily reporting discipline.",
      cards: [
        { label: "Present Today", value: String(presentToday), detail: "Employees who marked attendance today." },
        { label: "On Leave Today", value: String(onLeaveToday), detail: "Approved leave records active for today." },
        { label: "Projects Pending", value: String(pendingProjects), detail: "Projects in planning or hold state." },
        { label: "Projects In Progress", value: String(inProgressProjects), detail: "Projects currently under execution." },
        { label: "Projects Completed", value: String(completedProjects), detail: "Projects already closed successfully." },
        { label: "DSR Missing", value: String(dsrTrend.at(-1)?.missing ?? 0), detail: "Employees still missing today's DSR." },
      ],
      notificationTitle: "System Notifications",
      notifications,
      weeklySummaryTitle: "Weekly Summary",
      weeklySummaryCards: buildWeeklySummaryCards({
        attendanceRows: weekAttendance,
        dsrRows: weekUpdates,
        leaveRows: currentWindowLeaveRows,
        taskRows: currentWindowTaskRows,
        activePeopleCount: activeEmployees.length,
      }),
      calendarTitle: "Upcoming Calendar",
      calendarItems: buildCalendarItems({ leaves: leaveRows, tasks: taskRows, userMap: employeeMap }),
      performanceTitle: "Performance Score",
      performanceRows: (await buildPerformanceRows(employeeIds)).slice(0, 5),
      directoryTitle: "Employee Directory",
      directoryEmptyMessage: "No active employees available right now.",
      directoryItems: activeEmployees.map((employee) => ({
        id: employee._id.toString(),
        title: employee.fullName,
        meta: employee.joiningDate ? `Joined ${formatDate(employee.joiningDate)}` : "Joining date not added",
        description: [employee.email, employee.phone || "Phone not added"].join(" | "),
      })),
      primaryListTitle: "Today On Leave",
      primaryEmptyMessage: "No employees are on leave today.",
      primaryItems: todayLeaveRows.map((row) => ({
        id: row._id.toString(),
        title: employeeMap.get(row.userId)?.fullName ?? "Unknown employee",
        meta: `${formatLabel(row.leaveType)} | ${formatLabel(row.status)}`,
        description: row.reason?.trim() ? row.reason : `${row.startDate} to ${row.endDate}`,
      })),
      secondaryListTitle: "Employee Delivery Snapshot",
      secondaryEmptyMessage: "No employee project records are available yet.",
      secondaryItems: employeeProjectRows.slice(0, 5).map((row) => ({
        id: row.id,
        title: row.employeeName,
        meta: `Pending ${row.pendingProjects} | Completed ${row.completedProjects}`,
        description: row.employeeEmail,
      })),
      attendanceBreakdown,
      attendanceTrend,
      taskStatusBreakdown,
      projectStatusBreakdown,
      leaveTrend,
      dsrTrend,
      employeeProjectRows: employeeProjectRows.slice(0, 8),
    };
  }

  if (false) {
    const teamUserIds = await getVisibleUserIdsForSession(session, { employeesOnly: true });
    const scope = inScope(teamUserIds);
    const [teamCount, todaysAttendance, pendingLeaves, pendingTasks, taskRows, dsrRows, weekAttendance] = await Promise.all([
      UserModel.countDocuments({ _id: scope, role: "EMPLOYEE", status: "ACTIVE" }),
      AttendanceModel.find({ userId: scope, dateKey: today }, { userId: 1 }).lean(),
      LeaveRequestModel.countDocuments({ userId: scope, status: "PENDING" }),
      TaskModel.countDocuments({ assignedByUserId: session.user.id, status: { $ne: "COMPLETED" } }),
      TaskModel.find({ assignedByUserId: session.user.id }, { title: 1, dueDate: 1, status: 1, assignedUserId: 1, priority: 1 }).sort({ createdAt: -1 }).limit(5).lean(),
      DailyUpdateModel.find({ userId: scope }, { userId: 1, summary: 1, workDate: 1 }).sort({ createdAt: -1 }).limit(5).lean(),
      AttendanceModel.find({ userId: scope, dateKey: { $gte: weekStart, $lte: today } }, { userId: 1, status: 1 }).lean(),
    ]);
    const presentToday = new Set(todaysAttendance.map((row) => row.userId)).size;
    const userMap = await buildUserMap([...taskRows.map((row) => row.assignedUserId), ...dsrRows.map((row) => row.userId)]);

    return {
      title: "Manager Dashboard",
      description: "Team operations view for attendance, task ownership, leave approvals, and daily reporting.",
      cards: [
        { label: "Team Members", value: String(teamCount), detail: "Employees currently in your visible team scope." },
        { label: "Present Today", value: String(presentToday), detail: "Team attendance marked for today." },
        { label: "Absent Today", value: String(Math.max(teamCount - presentToday, 0)), detail: "Team members missing attendance today." },
        { label: "Pending Leaves", value: String(pendingLeaves), detail: "Pending leave requests from your visible team." },
        { label: "Open Tasks", value: String(pendingTasks), detail: "Tasks assigned by you that are still active." },
      ],
      notificationTitle: "System Notifications",
      notifications,
      weeklySummaryTitle: "Weekly Summary",
      weeklySummaryCards: buildWeeklySummaryCards({
        attendanceRows: weekAttendance,
        dsrRows,
        leaveRows: [],
        taskRows,
        activePeopleCount: teamCount,
      }),
      calendarTitle: "Upcoming Calendar",
      calendarItems: buildCalendarItems({ leaves: [], tasks: taskRows, userMap }),
      performanceTitle: "Performance Score",
      performanceRows: (await buildPerformanceRows(teamUserIds)).slice(0, 5),
      primaryListTitle: "Recent Team Tasks",
      primaryEmptyMessage: "No team tasks available yet.",
      primaryItems: taskRows.map((row) => ({
        id: row._id.toString(),
        title: row.title,
        meta: `${userMap.get(row.assignedUserId)?.fullName ?? "Unknown employee"} • ${formatLabel(row.priority ?? "MEDIUM")}`,
        description: `Due ${row.dueDate} • ${formatLabel(row.status)}`,
      })),
      secondaryListTitle: "Recent Team DSR",
      secondaryEmptyMessage: "No DSR entries from your team yet.",
      secondaryItems: dsrRows.map((row) => ({
        id: row._id.toString(),
        title: row.summary,
        meta: userMap.get(row.userId)?.fullName ?? "Unknown employee",
        description: row.workDate,
      })),
    };
  }

  const [attendanceRow, pendingLeaves, openTasks, projectCount, dsrCount, taskRows, rawUnread] = await Promise.all([
    AttendanceModel.findOne({ userId: session.user.id, dateKey: today }).lean(),
    LeaveRequestModel.countDocuments({ userId: session.user.id, status: "PENDING" }),
    TaskModel.countDocuments({ assignedUserId: session.user.id, status: { $ne: "COMPLETED" } }),
    ProjectModel.countDocuments({ assignedUserIds: session.user.id }),
    DailyUpdateModel.countDocuments({ userId: session.user.id, workDate: today }),
    TaskModel.find({ assignedUserId: session.user.id }, { title: 1, dueDate: 1, status: 1, priority: 1 }).sort({ createdAt: -1 }).limit(5).lean(),
    getUnreadAssignmentsForUser(session.user.id),
  ]);

  const unreadAssignments = rawUnread.map((n) => ({
    id: n._id.toString(),
    type: n.type as "TASK_ASSIGNED" | "PROJECT_ASSIGNED",
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl ?? "",
    createdAt: n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  }));

  return {
    title: "Employee Dashboard",
    description: "Personal workflow view for attendance, assigned tasks, DSR discipline, and upcoming work.",
    unreadAssignments,
    cards: [
      { label: "Attendance", value: attendanceRow ? formatLabel(attendanceRow.status) : "Not Marked", detail: "Your current attendance status for today." },
      { label: "Pending Leaves", value: String(pendingLeaves), detail: "Your leave requests waiting for review." },
      { label: "Open Tasks", value: String(openTasks), detail: "Assigned tasks still in progress." },
      { label: "Assigned Projects", value: String(projectCount), detail: "Projects currently linked to your account." },
      { label: "DSR Today", value: dsrCount ? "Submitted" : "Pending", detail: "Daily status report state for today." },
    ],
    notificationTitle: "System Notifications",
    notifications,
    weeklySummaryTitle: "Weekly Summary",
    weeklySummaryCards: buildWeeklySummaryCards({
      attendanceRows: attendanceRow ? [attendanceRow] : [],
      dsrRows: dsrCount ? [{ userId: session.user.id, workDate: today }] : [],
      leaveRows: [],
      taskRows,
      activePeopleCount: 1,
    }),
    calendarTitle: "Upcoming Calendar",
    calendarItems: buildCalendarItems({
      leaves: [],
      tasks: taskRows.map((task) => ({ ...task, assignedUserId: session.user.id })),
      userMap: new Map([[session.user.id, { fullName: session.user.fullName, email: session.user.email }]]),
    }),
    performanceTitle: "Performance Score",
    performanceRows: await buildPerformanceRows([session.user.id]),
    primaryListTitle: "My Tasks",
    primaryEmptyMessage: "No tasks assigned right now.",
    primaryItems: taskRows.map((row) => ({
      id: row._id.toString(),
      title: row.title,
      meta: `${formatLabel(row.status)} • ${formatLabel(row.priority ?? "MEDIUM")}`,
      description: `Due ${row.dueDate}`,
    })),
    secondaryListTitle: "My Work Focus",
    secondaryEmptyMessage: "Your next work updates will appear here.",
    secondaryItems: [
      { id: "attendance", title: "Mark Attendance", meta: "Daily", description: "Use the Attendance page to check in and check out." },
      { id: "dsr", title: "Submit DSR", meta: "Daily", description: "Use the DSR page to report today’s work and tomorrow’s plan." },
      { id: "leave", title: "Apply Leave", meta: "As needed", description: "Use the Leaves page for sick or paid leave requests." },
    ],
  };
}

export async function getEmployeesPageData(session?: AuthenticatedSession): Promise<EmployeesPageData> {
  await connectDb();

  const hasAdminLikeAccess = session?.user.role === "SUPER_ADMIN" || session?.user.role === "MANAGER";
  const isSalesSelfView = session?.user.role === "SALES";
  const userFilter = hasAdminLikeAccess
    ? { role: { $ne: "SUPER_ADMIN" } }
    : isSalesSelfView
      ? { _id: session.user.id }
      : { _id: { $in: [] } };

  const users = await UserModel.find(
    userFilter,
    { fullName: 1, email: 1, phone: 1, joiningDate: 1, managerId: 1, role: 1, status: 1, projectIds: 1, techStack: 1, documentName: 1, documentUrl: 1 },
  ).sort({ createdAt: -1 }).lean();

  const updatesFilter = hasAdminLikeAccess ? {} : { userId: { $in: [] } };
  const salesScopeFilter = hasAdminLikeAccess ? {} : isSalesSelfView ? { salesUserId: session.user.id } : { _id: { $in: [] } };
  const today = getTodayDate();
  const employeeIds = users.filter((user) => user.role === "EMPLOYEE" && user.status === "ACTIVE").map((user) => user._id.toString());

  const [
    projects,
    updates,
    managerUsers,
    salesUsers,
    salesLeads,
    salesCustomers,
    salesFollowUps,
    salesDeals,
    salesPayments,
    salesTargets,
    todayAttendance,
    todayLeaves,
    userMap,
    managerMap,
  ] = await Promise.all([
    ProjectModel.find(
      hasAdminLikeAccess ? {} : isSalesSelfView ? { assignedUserIds: session.user.id } : { _id: { $in: [] } },
      { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1, assignedUserIds: 1, createdByUserId: 1, closedByEmployeeId: 1, closedByEmployeeAt: 1, clientName: 1, clientBudget: 1 },
    )
      .sort({ createdAt: -1 })
      .lean(),
    DailyUpdateModel.find(updatesFilter, { userId: 1, projectId: 1, workDate: 1, summary: 1, accomplishments: 1, blockers: 1, nextPlan: 1, attachments: 1 }).sort({ createdAt: -1 }).limit(8).lean(),
    UserModel.find({ role: "MANAGER", status: "ACTIVE" }, { fullName: 1, email: 1 }).sort({ fullName: 1 }).lean(),
    UserModel.find({ role: "SALES", status: "ACTIVE" }, { fullName: 1, email: 1 }).sort({ fullName: 1 }).lean(),
    SalesLeadModel.find(salesScopeFilter).sort({ createdAt: -1 }).lean(),
    SalesCustomerModel.find(salesScopeFilter).sort({ updatedAt: -1 }).limit(10).lean(),
    SalesFollowUpModel.find(salesScopeFilter).sort({ followUpDate: 1, followUpTime: 1, createdAt: -1 }).limit(12).lean(),
    SalesDealModel.find(salesScopeFilter).sort({ updatedAt: -1 }).limit(12).lean(),
    SalesPaymentModel.find(salesScopeFilter).sort({ dueDate: 1, updatedAt: -1 }).limit(12).lean(),
    SalesTargetModel.find(salesScopeFilter).sort({ monthKey: -1, createdAt: -1 }).limit(6).lean(),
    AttendanceModel.find({ userId: inScope(employeeIds), dateKey: today }, { userId: 1 }).lean(),
    LeaveRequestModel.find(
      { userId: inScope(employeeIds), status: "APPROVED", startDate: { $lte: today }, endDate: { $gte: today } },
      { userId: 1 },
    ).lean(),
    buildUserMap(users.map((user) => user._id.toString())),
    buildUserMap(users.map((user) => user.managerId).filter(Boolean)),
  ]);

  const projectMap = await buildProjectMap(projects.map((project) => project._id.toString()));
  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const managerCount = users.filter((user) => user.role === "MANAGER").length;
  const employeeCount = users.filter((user) => user.role === "EMPLOYEE").length;
  const salesCount = users.filter((user) => user.role === "SALES").length;
  // Extend map with admin/super-admin who may have personal pitches assigned to themselves
  const salesUserMap = new Map<string, { fullName: string; email: string }>(
    salesUsers.map((user) => [user._id.toString(), { fullName: user.fullName, email: user.email }]),
  );
  if (session && (session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER")) {
    salesUserMap.set(session.user.id, { fullName: session.user.fullName, email: session.user.email });
  }
  const presentTodayIds = new Set(todayAttendance.map((row) => row.userId));
  const onLeaveTodayIds = new Set(todayLeaves.map((row) => row.userId));
  const presentTodayCount = presentTodayIds.size;
  const onLeaveTodayCount = Array.from(onLeaveTodayIds).filter((userId) => !presentTodayIds.has(userId)).length;
  const notMarkedTodayCount = Math.max(employeeCount - presentTodayCount - onLeaveTodayCount, 0);
  const assignedManagerCount = users.filter((user) => (user.role === "EMPLOYEE" || user.role === "SALES") && user.managerId).length;
  const salesLeadRows: SalesLeadEntry[] = salesLeads.map((lead) => ({
    id: lead._id.toString(),
    salesUserId: lead.salesUserId,
    salesUserName: salesUserMap.get(lead.salesUserId)?.fullName ?? "Unknown sales employee",
    salesUserEmail: salesUserMap.get(lead.salesUserId)?.email ?? "",
    companyName: lead.companyName ?? "",
    clientName: lead.clientName,
    clientPhone: lead.clientPhone ?? "",
    clientEmail: lead.clientEmail ?? "",
    source: lead.source ?? "Website",
    status: lead.status ?? "NEW",
    priority: lead.priority ?? "WARM",
    technologies: lead.technologies ?? [],
    meetingLink: lead.meetingLink ?? "",
    meetingDate: lead.meetingDate ?? "",
    meetingTime: lead.meetingTime ?? "",
    nextFollowUpDate: lead.nextFollowUpDate ?? "",
    expectedCloseDate: lead.expectedCloseDate ?? "",
    budget: Number(lead.budget ?? 0),
    pitchedPrice: Number(lead.pitchedPrice ?? 0),
    deliveryDate: lead.deliveryDate ?? "",
    notes: lead.notes ?? "",
    callStatus: lead.callStatus ?? "",
    dateOfFirstCall: lead.dateOfFirstCall ?? "",
    dateOfLastCall: lead.dateOfLastCall ?? "",
    callbackReminderDate: lead.callbackReminderDate ?? "",
    callNotes: lead.callNotes ?? "",
    createdAt: formatDate(lead.createdAt),
  }));
  const salesCustomerRows: SalesCustomerEntry[] = salesCustomers.map((customer) => ({
    id: customer._id.toString(),
    salesUserId: customer.salesUserId,
    salesUserName: salesUserMap.get(customer.salesUserId)?.fullName ?? "Unknown sales employee",
    companyName: customer.companyName ?? "",
    clientName: customer.clientName,
    clientEmail: customer.clientEmail ?? "",
    status: customer.status,
    lastContactDate: customer.lastContactDate ?? "",
    totalBilledAmount: Number(customer.totalBilledAmount ?? 0),
    outstandingAmount: Number(customer.outstandingAmount ?? 0),
  }));
  const salesFollowUpRows: SalesFollowUpEntry[] = salesFollowUps.map((followUp) => ({
    id: followUp._id.toString(),
    salesUserId: followUp.salesUserId,
    salesUserName: salesUserMap.get(followUp.salesUserId)?.fullName ?? "Unknown sales employee",
    clientName: followUp.clientName,
    leadId: followUp.salesLeadId ?? "",
    followUpDate: followUp.followUpDate,
    followUpTime: followUp.followUpTime ?? "",
    channel: followUp.channel,
    status: followUp.status,
    outcome: followUp.outcome ?? "",
    nextFollowUpDate: followUp.nextFollowUpDate ?? "",
  }));
  const salesDealRows: SalesDealEntry[] = salesDeals.map((deal) => ({
    id: deal._id.toString(),
    salesUserId: deal.salesUserId,
    salesUserName: salesUserMap.get(deal.salesUserId)?.fullName ?? "Unknown sales employee",
    title: deal.title,
    leadId: deal.salesLeadId ?? "",
    customerId: deal.customerId ?? "",
    stage: deal.stage,
    status: deal.status,
    amount: Number(deal.amount ?? 0),
    probability: Number(deal.probability ?? 0),
    expectedCloseDate: deal.expectedCloseDate ?? "",
  }));
  const salesPaymentRows: SalesPaymentEntry[] = salesPayments.map((payment) => ({
    id: payment._id.toString(),
    salesUserId: payment.salesUserId,
    salesUserName: salesUserMap.get(payment.salesUserId)?.fullName ?? "Unknown sales employee",
    invoiceNumber: payment.invoiceNumber ?? "",
    customerId: payment.customerId ?? "",
    dealId: payment.dealId ?? "",
    amount: Number(payment.amount ?? 0),
    receivedAmount: Number(payment.receivedAmount ?? 0),
    dueDate: payment.dueDate ?? "",
    receivedDate: payment.receivedDate ?? "",
    status: payment.status,
  }));
  const salesTargetRows: SalesTargetEntry[] = salesTargets.map((target) => {
    const targetAmount = Number(target.targetAmount ?? 0);
    const achievedAmount = Number(target.achievedAmount ?? 0);

    return {
      id: target._id.toString(),
      salesUserId: target.salesUserId,
      salesUserName: salesUserMap.get(target.salesUserId)?.fullName ?? "Unknown sales employee",
      monthKey: target.monthKey,
      targetAmount,
      achievedAmount,
      incentiveAmount: Number(target.incentiveAmount ?? 0),
      status: target.status,
      achievementRate: targetAmount > 0 ? Math.round((achievedAmount / targetAmount) * 100) : 0,
    };
  });
  const salesWorkspace = buildSalesWorkspaceData({
    customers: salesCustomerRows,
    deals: salesDealRows,
    followUps: salesFollowUpRows,
    leads: salesLeadRows,
    payments: salesPaymentRows,
    targets: salesTargetRows,
    today,
  });
  const workforceSummaryCards =
    isSalesSelfView
      ? salesWorkspace.summaryCards
      : session?.user.role === "SUPER_ADMIN"
      ? [
          { label: "Total Employees", value: String(employeeCount), detail: "Active employee accounts currently available in the company." },
          { label: "Present Today", value: String(presentTodayCount), detail: "Employees who have already marked attendance today." },
          { label: "On Leave Today", value: String(onLeaveTodayCount), detail: "Employees currently on approved leave." },
          { label: "Not Marked", value: String(notMarkedTodayCount), detail: "Employees who have not marked attendance yet today." },
          { label: "Assigned Admin", value: String(assignedManagerCount), detail: "Employee and sales accounts already mapped to a reporting admin." },
        ]
      : [
          { label: "Total Team", value: String(activeUsers.length), detail: "Active admin, sales, and employee accounts available in the company." },
          { label: "Admins", value: String(managerCount), detail: "Admin accounts currently active." },
          { label: "Employees", value: String(employeeCount), detail: "Employee accounts available for task and project assignment." },
          { label: "Sales Team", value: String(salesCount), detail: "Sales accounts available for client handling and meeting coordination." },
          { label: "Projects", value: String(projects.length), detail: "Projects available for employee assignment and DSR mapping." },
        ];

  return {
    managerOptions: managerUsers.map((manager) => ({
      id: manager._id.toString(),
      label: `${manager.fullName} (${manager.email})`,
    })),
    salesOptions: [
      // Admin/Super Admin can pitch personally — show "Me" as the first option
      ...(hasAdminLikeAccess && session
        ? [{ id: session.user.id, label: `${session.user.fullName} — Personal Pitch (Me)` }]
        : []),
      ...salesUsers.map((salesUser) => ({
        id: salesUser._id.toString(),
        label: `${salesUser.fullName} (${salesUser.email})`,
      })),
    ],
    salesTechnologyOptions: [...SALES_TECH_OPTIONS],
    salesLeadSourceOptions: [...SALES_LEAD_SOURCES],
    salesLeadStatusOptions: [...SALES_LEAD_STATUSES],
    salesLeadPriorityOptions: [...SALES_LEAD_PRIORITIES],
    summaryCards: workforceSummaryCards,
    users: users.map((user) => ({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? "",
      joiningDate: formatDate(user.joiningDate),
      managerId: user.managerId ?? "",
      managerName: user.managerId ? managerMap.get(user.managerId)?.fullName ?? "Unknown admin" : "",
      techStack: user.techStack ?? [],
      todayStatus:
        user.role !== "EMPLOYEE"
          ? user.role === "MANAGER"
            ? "Admin"
            : "Sales"
          : presentTodayIds.has(user._id.toString())
            ? "Present"
            : onLeaveTodayIds.has(user._id.toString())
              ? "On Leave"
              : "Not Marked",
      role: user.role,
      status: user.status ?? "ACTIVE",
      projectIds: user.projectIds ?? [],
      documentName: user.documentName ?? "",
      documentUrl: user.documentUrl ?? "",
      employeeId: readString(toRecord(user).employeeId) ?? "",
      department: readString(toRecord(user).department) ?? "",
      designation: readString(toRecord(user).designation) ?? "",
      dateOfBirth: (() => {
        const raw = toRecord(user).dateOfBirth;
        if (raw instanceof Date) {
          return formatDate(raw);
        }
        if (typeof raw === "string") {
          const parsed = new Date(raw);
          return Number.isNaN(parsed.getTime()) ? "" : formatDate(parsed);
        }
        return "";
      })(),
      address: readString(toRecord(user).address) ?? "",
      emergencyContact: readString(toRecord(user).emergencyContact) ?? "",
      bankAccountNumber: readString(toRecord(user).bankAccountNumber) ?? "",
      bankName: readString(toRecord(user).bankName) ?? "",
      bankIfscCode: readString(toRecord(user).bankIfscCode) ?? "",
      panNumber: readString(toRecord(user).panNumber) ?? "",
      profilePhotoUrl: readString(toRecord(user).profilePhotoUrl) ?? "",
    })),
    projects: projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      summary: project.summary,
      status: project.status,
      priority: project.priority,
      dueDate: formatDate(project.dueDate),
      techStack: resolveProjectTechStack(project),
      assignedUserIds: project.assignedUserIds ?? [],
      assignedUserNames: (project.assignedUserIds ?? []).map((userId) => userMap.get(userId)?.fullName ?? "Assigned employee"),
      createdByUserId: project.createdByUserId ?? "",
      closedByEmployeeId: (project as { closedByEmployeeId?: string }).closedByEmployeeId ?? "",
      closedByEmployeeAt: formatDate((project as { closedByEmployeeAt?: Date | null }).closedByEmployeeAt ?? null),
      clientName: String((project as { clientName?: string }).clientName ?? ""),
      clientBudget: Number((project as { clientBudget?: number }).clientBudget ?? 0),
    })),
    salesLeadRows,
    salesWorkspace,
    recentUpdates: updates.map((update) => ({
      id: update._id.toString(),
      employeeName: userMap.get(update.userId)?.fullName ?? "Unknown employee",
      employeeEmail: userMap.get(update.userId)?.email ?? "",
      projectName: update.projectId ? projectMap.get(update.projectId) ?? "General" : "General",
      workDate: update.workDate,
      summary: update.summary,
      accomplishments: update.accomplishments,
      blockers: update.blockers ?? "",
      nextPlan: update.nextPlan ?? "",
      attachments: mapAttachments(update.attachments),
    })),
  };
}

export async function getProjectsPageData(session: AuthenticatedSession): Promise<ProjectsPageData> {
  await connectDb();

  const hasLeadershipAccess = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  if (!hasLeadershipAccess) {
    // Employee: return only projects assigned to them
    const myProjects = await ProjectModel.find(
      { assignedUserIds: session.user.id },
      { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1, assignedUserIds: 1, closedByEmployeeId: 1, closedByEmployeeAt: 1, clientName: 1, clientBudget: 1 },
    ).sort({ updatedAt: -1 }).lean();

    return {
      summaryCards: [
        { label: "My Projects", value: String(myProjects.length), detail: "Projects you have been assigned to." },
        { label: "In Progress", value: String(myProjects.filter((p) => p.status === "IN_PROGRESS").length), detail: "Currently active projects." },
        { label: "Completed", value: String(myProjects.filter((p) => p.status === "COMPLETED").length), detail: "Projects you have completed." },
      ],
      projects: myProjects.map((project) => ({
        id: project._id.toString(),
        name: project.name,
        summary: project.summary,
        status: project.status,
        priority: project.priority,
        dueDate: formatDate(project.dueDate),
        techStack: resolveProjectTechStack(project),
        assignedUserIds: project.assignedUserIds ?? [],
        assignedUserNames: [],
        createdByUserId: "",
        closedByEmployeeId: project.closedByEmployeeId ?? "",
        closedByEmployeeAt: formatDate(project.closedByEmployeeAt ?? null),
        clientName: String((project as { clientName?: string }).clientName ?? ""),
        clientBudget: Number((project as { clientBudget?: number }).clientBudget ?? 0),
      })),
      employeeOptions: [],
      technologyOptions: [...SALES_TECH_OPTIONS],
    };
  }

  const [projects, assignableUsers] = await Promise.all([
    ProjectModel.find(
      {},
      { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1, assignedUserIds: 1, createdByUserId: 1, closedByEmployeeId: 1, closedByEmployeeAt: 1, clientName: 1, clientBudget: 1 },
    )
      .sort({ updatedAt: -1 })
      .lean(),
    // Include EMPLOYEE + MANAGER + SUPER_ADMIN — all can be assigned to projects
    UserModel.find(
      { role: { $in: ["EMPLOYEE", "MANAGER", "SUPER_ADMIN"] }, status: "ACTIVE" },
      { fullName: 1, email: 1, role: 1 },
    ).sort({ role: 1, fullName: 1 }).lean(),
  ]);

  // Keep backwards compat: employees = all assignable users
  const employees = assignableUsers;
  const employeeMap = new Map(employees.map((employee) => [employee._id.toString(), employee]));
  const uniqueAssignedEmployeeIds = new Set(projects.flatMap((project) => project.assignedUserIds ?? []));
  const inProgressProjects = projects.filter((project) => project.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter((project) => project.status === "COMPLETED").length;
  const plannedProjects = projects.filter((project) => project.status === "PLANNING" || project.status === "ON_HOLD").length;
  const closedByEmployeeCount = projects.filter((project) => project.closedByEmployeeId).length;

  return {
    summaryCards: [
      { label: "Total Projects", value: String(projects.length), detail: "Project records currently maintained in the workspace." },
      { label: "In Progress", value: String(inProgressProjects), detail: "Projects currently under active execution." },
      { label: "Completed", value: String(completedProjects), detail: "Projects already marked complete." },
      { label: "Planned / Hold", value: String(plannedProjects), detail: "Projects still waiting to start or paused." },
      { label: "Closed by Employee", value: String(closedByEmployeeCount), detail: "Projects employees have self-reported as closed." },
      { label: "Assigned Employees", value: String(uniqueAssignedEmployeeIds.size), detail: "Employees currently mapped to at least one project." },
    ],
    projects: projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      summary: project.summary,
      status: project.status,
      priority: project.priority,
      dueDate: formatDate(project.dueDate),
      techStack: resolveProjectTechStack(project),
      assignedUserIds: project.assignedUserIds ?? [],
      assignedUserNames: (project.assignedUserIds ?? []).map((userId) => employeeMap.get(userId)?.fullName ?? "Assigned employee"),
      createdByUserId: project.createdByUserId ?? "",
      closedByEmployeeId: project.closedByEmployeeId ?? "",
      closedByEmployeeAt: formatDate(project.closedByEmployeeAt ?? null),
      clientName: String((project as { clientName?: string }).clientName ?? ""),
      clientBudget: Number((project as { clientBudget?: number }).clientBudget ?? 0),
    })),
    employeeOptions: employees.map((employee) => ({
      id: employee._id.toString(),
      label: `${employee.fullName} (${employee.email})`,
      role: (employee as unknown as { role?: string }).role ?? "EMPLOYEE",
    })),
    technologyOptions: [...SALES_TECH_OPTIONS],
  };
}

export async function getAttendancePageData(session: AuthenticatedSession): Promise<AttendancePageData> {
  await connectDb();

  const today = getTodayDate();
  const monthPrefix = today.slice(0, 7);
  const scopeIds =
    session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER"
      ? await getAllActiveEmployeeIds()
      : await getVisibleUserIdsForSession(session, { employeesOnly: true });
  const attendanceIds = session.user.role === "EMPLOYEE" ? [session.user.id] : scopeIds;
  const attendanceScope = inScope(attendanceIds);

  const [todayRecord, todayRecords, monthlyRecords, users] = await Promise.all([
    AttendanceModel.findOne({ userId: session.user.id, dateKey: today }).lean(),
    AttendanceModel.find({ userId: attendanceScope, dateKey: today }).sort({ checkInAt: 1 }).lean(),
    AttendanceModel.find({ userId: attendanceScope, dateKey: { $regex: `^${monthPrefix}` } }).lean(),
    UserModel.find({ _id: attendanceScope }, { fullName: 1, email: 1, role: 1, status: 1 }).lean(),
  ]);

  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const todayRecordMap = new Map(todayRecords.map((record) => [record.userId, record]));
  const presentCount = new Set(todayRecords.map((record) => record.userId)).size;
  const completedCount = todayRecords.filter((row) => row.status === "COMPLETED").length;
  const missingCount = Math.max(activeUsers.length - presentCount, 0);
  const monthlyMap = new Map<string, AttendanceMonthlyRow>();

  for (const record of monthlyRecords) {
    const entry = monthlyMap.get(record.userId) ?? {
      id: record.userId,
      employeeName: userMap.get(record.userId)?.fullName ?? "Unknown employee",
      daysMarked: 0,
      completedDays: 0,
    };
    entry.daysMarked += 1;
    if (record.status === "COMPLETED") {
      entry.completedDays += 1;
    }
    monthlyMap.set(record.userId, entry);
  }

  const canViewLocation = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  return {
    canMarkAttendance: session.user.role === "EMPLOYEE",
    canViewLocation,
    summaryCards: [
      { label: "Present Today", value: String(presentCount), detail: "Attendance entries marked for today." },
      { label: "Checked Out", value: String(completedCount), detail: "People who have completed checkout." },
      { label: "Not Marked", value: String(missingCount), detail: "Visible team members with no attendance yet." },
      { label: "My Status", value: todayRecord ? formatLabel(todayRecord.status) : "Not Marked", detail: "Your current attendance state for today." },
    ],
    todayRecord: todayRecord
      ? {
          id: todayRecord._id.toString(),
          employeeName: session.user.fullName,
          employeeEmail: session.user.email,
          dateKey: todayRecord.dateKey,
          checkInAt: formatDateTime(todayRecord.checkInAt),
          checkOutAt: formatDateTime(todayRecord.checkOutAt),
          status: todayRecord.status,
          workMode: readString(toRecord(todayRecord).workMode) ?? "OFFICE",
          isHalfDay: readBoolean(toRecord(todayRecord).isHalfDay) ?? false,
          isLate: readBoolean(toRecord(todayRecord).isLate) ?? false,
          lateByMinutes: readNumberLike(toRecord(todayRecord).lateByMinutes) ?? 0,
          overtimeMinutes: readNumberLike(toRecord(todayRecord).overtimeMinutes) ?? 0,
          workedMinutes: readNumberLike(toRecord(todayRecord).workedMinutes) ?? 0,
          checkInLocation: null,
        }
      : null,
    todayRecords: activeUsers
      .map((user) => {
        const record = todayRecordMap.get(user._id.toString());

        if (!record) {
          return {
            id: `missing-${user._id.toString()}`,
            employeeName: user.fullName,
            employeeEmail: user.email,
            dateKey: today,
            checkInAt: "Not marked",
            checkOutAt: "Not marked",
            status: "NOT_MARKED",
            workMode: "OFFICE",
            isHalfDay: false,
            isLate: false,
            lateByMinutes: 0,
            overtimeMinutes: 0,
            workedMinutes: 0,
          };
        }

        const rawLocation = (toRecord(record).checkInLocation ?? null) as { lat?: unknown; lng?: unknown; accuracy?: unknown } | null;
        const checkInLocation =
          canViewLocation && rawLocation && typeof rawLocation.lat === "number" && typeof rawLocation.lng === "number"
            ? {
                lat: rawLocation.lat,
                lng: rawLocation.lng,
                accuracy: typeof rawLocation.accuracy === "number" ? rawLocation.accuracy : null,
              }
            : null;

        return {
          id: record._id.toString(),
          employeeName: user.fullName,
          employeeEmail: user.email,
          dateKey: record.dateKey,
          checkInAt: formatDateTime(record.checkInAt),
          checkOutAt: formatDateTime(record.checkOutAt),
          status: record.status,
          workMode: readString(toRecord(record).workMode) ?? "OFFICE",
          isHalfDay: readBoolean(toRecord(record).isHalfDay) ?? false,
          isLate: readBoolean(toRecord(record).isLate) ?? false,
          lateByMinutes: readNumberLike(toRecord(record).lateByMinutes) ?? 0,
          overtimeMinutes: readNumberLike(toRecord(record).overtimeMinutes) ?? 0,
          workedMinutes: readNumberLike(toRecord(record).workedMinutes) ?? 0,
          checkInLocation,
        };
      })
      .sort((left, right) => {
        const leftPending = left.status === "NOT_MARKED" ? 1 : 0;
        const rightPending = right.status === "NOT_MARKED" ? 1 : 0;
        return rightPending - leftPending || left.employeeName.localeCompare(right.employeeName);
      }),
    monthlyRows: Array.from(monthlyMap.values()).sort((left, right) => left.employeeName.localeCompare(right.employeeName)),
  };
}

export async function getLeavesPageData(session: AuthenticatedSession): Promise<LeavePageData> {
  await connectDb();

  const visibleUserIds = await getVisibleUserIdsForSession(session, { employeesOnly: true });
  const leaveFilter =
    session.user.role === "SUPER_ADMIN"
      ? {}
      : { userId: inScope(session.user.role === "MANAGER" ? visibleUserIds : [session.user.id]) };

  const [leaves, users] = await Promise.all([
    LeaveRequestModel.find(leaveFilter).sort({ updatedAt: -1, createdAt: -1 }).lean(),
    UserModel.find({}, { fullName: 1, email: 1 }).lean(),
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const employeeSummaryMap = new Map<string, LeaveEmployeeSummary>();

  for (const leave of leaves) {
    const employeeId = leave.userId;
    const employee = userMap.get(employeeId);
    const requestedDays = getDateRangeDays(leave.startDate, leave.endDate);
    const summary = employeeSummaryMap.get(employeeId) ?? {
      id: employeeId,
      employeeName: employee?.fullName ?? "Unknown employee",
      employeeEmail: employee?.email ?? "",
      approvedRequests: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      approvedDays: 0,
      requestedDays: 0,
    };

    summary.requestedDays += requestedDays;
    if (leave.status === "APPROVED") {
      summary.approvedRequests += 1;
      summary.approvedDays += requestedDays;
    } else if (leave.status === "REJECTED") {
      summary.rejectedRequests += 1;
    } else {
      summary.pendingRequests += 1;
    }

    employeeSummaryMap.set(employeeId, summary);
  }

  return {
    summaryCards: [
      { label: "Pending", value: String(leaves.filter((item) => item.status === "PENDING").length), detail: "Leave requests awaiting review." },
      { label: "Approved", value: String(leaves.filter((item) => item.status === "APPROVED").length), detail: "Approved leave requests." },
      { label: "Rejected", value: String(leaves.filter((item) => item.status === "REJECTED").length), detail: "Rejected leave requests." },
      { label: "History", value: String(leaves.length), detail: "Total leave requests in your current scope." },
    ],
    leaves: leaves.map((leave) => ({
      id: leave._id.toString(),
      employeeId: leave.userId,
      employeeName: userMap.get(leave.userId)?.fullName ?? "Unknown employee",
      employeeEmail: userMap.get(leave.userId)?.email ?? "",
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      requestedDays: getDateRangeDays(leave.startDate, leave.endDate),
      reason: leave.reason,
      status: leave.status,
      updatedAt: formatDateTime(leave.updatedAt),
    })),
    employeeSummaries: Array.from(employeeSummaryMap.values()).sort(
      (left, right) =>
        right.approvedDays - left.approvedDays ||
        right.pendingRequests - left.pendingRequests ||
        left.employeeName.localeCompare(right.employeeName),
    ),
  };
}

export async function getTasksPageData(session: AuthenticatedSession): Promise<TaskPageData> {
  await connectDb();

  const hasAdminLikeAccess = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  const taskFilter =
    hasAdminLikeAccess
      ? {}
      : { $or: [{ assignedUserId: session.user.id }, { assignedByUserId: session.user.id }] };
  // Tasks can be assigned to employees, managers, and super admins (self-assign supported)
  const assignableRoleFilter = { role: { $in: ["EMPLOYEE", "MANAGER", "SUPER_ADMIN"] }, status: "ACTIVE" };

  const [tasks, employees, users, assignedProjects] = await Promise.all([
    TaskModel.find(taskFilter).sort({ createdAt: -1 }).lean(),
    UserModel.find(assignableRoleFilter, { fullName: 1, email: 1, role: 1 }).sort({ fullName: 1 }).lean(),
    UserModel.find({}, { fullName: 1 }).lean(),
    hasAdminLikeAccess
      ? Promise.resolve([])
      : ProjectModel.find({ assignedUserIds: session.user.id }, { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1 })
          .sort({ createdAt: -1 })
          .lean(),
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user.fullName]));
  const overdueCount = tasks.filter((task) => task.status !== "COMPLETED" && task.dueDate < getTodayDate()).length;
  const highPriorityCount = tasks.filter((task) => task.priority === "HIGH").length;

  return {
    summaryCards: [
      { label: "Pending", value: String(tasks.filter((task) => task.status === "PENDING").length), detail: "Tasks waiting to start." },
      { label: "In Progress", value: String(tasks.filter((task) => task.status === "IN_PROGRESS").length), detail: "Tasks currently being worked on." },
      { label: "Overdue", value: String(overdueCount), detail: "Tasks that crossed their due date." },
      { label: "High Priority", value: String(highPriorityCount), detail: "Important tasks requiring closer follow-up." },
    ],
    tasks: tasks.map((task) => mapTaskRow(task, userMap)),
    assignedProjects: assignedProjects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      summary: project.summary,
      status: project.status,
      priority: project.priority,
      dueDate: formatDate(project.dueDate),
      techStack: resolveProjectTechStack(project),
    })),
    employeeOptions: employees.map((employee) => {
      const isSelf = employee._id.toString() === session.user.id;
      const role = (employee as unknown as { role?: string }).role ?? "EMPLOYEE";
      const roleSuffix = role === "SUPER_ADMIN" ? "Super Admin" : role === "MANAGER" ? "Admin" : "";
      const label = isSelf
        ? `${employee.fullName} — Me (${roleSuffix || "Employee"})`
        : roleSuffix
          ? `${employee.fullName} — ${roleSuffix} (${employee.email})`
          : `${employee.fullName} (${employee.email})`;
      return { id: employee._id.toString(), label, role };
    }),
    labelOptions: [...TASK_LABELS],
  };
}

export async function getDsrPageData(session: AuthenticatedSession): Promise<DsrPageData> {
  await connectDb();

  const today = getTodayDate();
  const currentTime = getCurrentTimeKey();

  if (session.user.role === "EMPLOYEE") {
    const [projects, updates] = await Promise.all([
      ProjectModel.find({ assignedUserIds: session.user.id }, { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1 }).sort({ createdAt: -1 }).lean(),
      DailyUpdateModel.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);
    const projectMap = new Map(projects.map((project) => [project._id.toString(), project.name]));
    const hasTodayDsr = updates.some((update) => update.workDate === today);

    return {
      mode: "employee",
      summaryCards: [
        { label: "Assigned Projects", value: String(projects.length), detail: "Projects currently assigned to you." },
        { label: "DSR Today", value: hasTodayDsr ? "Submitted" : "Pending", detail: "Your DSR status for today." },
        { label: "Total DSR", value: String(updates.length), detail: "Your recorded daily work reports." },
      ],
      projects: projects.map((project) => ({
        id: project._id.toString(),
          name: project.name,
          summary: project.summary,
          status: project.status,
          priority: project.priority,
          dueDate: formatDate(project.dueDate),
          techStack: resolveProjectTechStack(project),
        })),
      updates: updates.map((update) => ({
        id: update._id.toString(),
        workDate: update.workDate,
        summary: update.summary,
        accomplishments: update.accomplishments,
        blockers: update.blockers ?? "",
        nextPlan: update.nextPlan ?? "",
        projectId: update.projectId ?? "",
        projectName: update.projectId ? projectMap.get(update.projectId) ?? "General" : "General",
        attachments: mapAttachments(update.attachments),
      })),
      reminderMessage:
        !hasTodayDsr && currentTime >= "19:00"
          ? "It is after 7 PM and your DSR is still pending. Submit it today to keep reporting discipline clean."
          : "Submit your DSR before day close so your admin can review progress without follow-up.",
    };
  }

  const visibleEmployeeIds =
    session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER"
      ? await getAllActiveEmployeeIds()
      : await getVisibleUserIdsForSession(session, { employeesOnly: true });
  const scope = inScope(visibleEmployeeIds);
  const [updates, users, projects] = await Promise.all([
    DailyUpdateModel.find({ userId: scope, workDate: today }).sort({ createdAt: -1 }).limit(20).lean(),
    UserModel.find({ _id: scope }, { fullName: 1, email: 1, status: 1 }).lean(),
    ProjectModel.find({}, { name: 1 }).lean(),
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const projectMap = new Map(projects.map((project) => [project._id.toString(), project.name]));
  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const submittedTodayIds = new Set(updates.map((update) => update.userId));
  const missingEmployees = users
    .filter((user) => user.status === "ACTIVE" && !submittedTodayIds.has(user._id.toString()))
    .map((user) => ({
      id: user._id.toString(),
      employeeName: user.fullName,
      employeeEmail: user.email,
    }));

  return {
    mode: "review",
    summaryCards: [
      { label: "Submitted Today", value: String(submittedTodayIds.size), detail: "Employees who submitted DSR today." },
      { label: "Missing Today", value: String(missingEmployees.length), detail: "Employees still missing a DSR entry today." },
      { label: "Review Scope", value: String(activeUsers.length), detail: "Active employees visible in this DSR review scope." },
    ],
    updates: updates.map((update) => ({
      id: update._id.toString(),
      employeeName: userMap.get(update.userId)?.fullName ?? "Unknown employee",
      employeeEmail: userMap.get(update.userId)?.email ?? "",
      projectName: update.projectId ? projectMap.get(update.projectId) ?? "General" : "General",
      workDate: update.workDate,
      summary: update.summary,
      accomplishments: update.accomplishments,
      blockers: update.blockers ?? "",
      nextPlan: update.nextPlan ?? "",
      attachments: mapAttachments(update.attachments),
    })),
    missingEmployees,
    reminderMessage:
      currentTime >= "19:00"
        ? `${missingEmployees.length} employee(s) are still pending DSR after 7 PM.`
        : "Use this feed to monitor missing DSR before day close.",
  };
}

export async function getReportsPageData(session: AuthenticatedSession): Promise<ReportsPageData> {
  await connectDb();

  const today = getTodayDate();
  const weekStart = addDaysToDate(today, -6);
  const currentMonthKey = today.slice(0, 7);
  const monthStart = `${currentMonthKey}-01`;
  const monthDates = listDateRange(monthStart, today);
  const visibleEmployeeIds = await getVisibleUserIdsForSession(session, { employeesOnly: true });
  const scopedIds =
        session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER"
          ? await getAllActiveEmployeeIds()
          : session.user.role === "EMPLOYEE"
        ? [session.user.id]
        : visibleEmployeeIds;
  const scope = inScope(scopedIds);

  const [users, attendance, leaves, tasks, dsrRows] = await Promise.all([
      UserModel.find({ _id: scope }, { fullName: 1, email: 1 }).lean(),
      AttendanceModel.find({ userId: scope, dateKey: { $gte: monthStart, $lte: today } }).lean(),
      LeaveRequestModel.find({ userId: scope, endDate: { $gte: monthStart }, startDate: { $lte: today } }).sort({ createdAt: -1 }).lean(),
      TaskModel.find({ assignedUserId: scope, dueDate: { $gte: monthStart, $lte: getMonthEndDate(currentMonthKey) } }).sort({ createdAt: -1 }).lean(),
      DailyUpdateModel.find(
        { userId: scope, workDate: { $gte: monthStart, $lte: today } },
        { userId: 1, projectId: 1, workDate: 1, summary: 1, accomplishments: 1, blockers: 1, nextPlan: 1 },
      )
        .sort({ workDate: -1, createdAt: -1 })
        .lean(),
    ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const projectMap = await buildProjectMap(dsrRows.map((row) => row.projectId).filter(Boolean));
  const attendanceRows = new Map<string, AttendanceMonthlyRow>();
  const monthlyEmployeeRows = new Map<
      string,
      {
        id: string;
      employeeName: string;
      employeeEmail: string;
      attendanceDays: number;
      completedAttendanceDays: number;
      leaveDays: number;
        leaveRequests: number;
        taskCount: number;
        completedTaskCount: number;
        taskTitles: Set<string>;
        dailyRows: Array<{
          attendanceStatus: string;
          checkInAt: string;
          checkOutAt: string;
          date: string;
          dsrSummary: string;
          projectNames: Set<string>;
        }>;
        dsrRows: Array<{
          accomplishments: string;
          blockers: string;
          id: string;
          nextPlan: string;
          projectName: string;
          summary: string;
          workDate: string;
        }>;
        taskRows: Array<{
          dueDate: string;
          id: string;
          priority: string;
          status: string;
          title: string;
        }>;
      }
    >();

  for (const row of attendance) {
    const item = attendanceRows.get(row.userId) ?? {
      id: row.userId,
      employeeName: userMap.get(row.userId)?.fullName ?? "Unknown employee",
      daysMarked: 0,
      completedDays: 0,
    };
    item.daysMarked += 1;
    if (row.status === "COMPLETED") {
      item.completedDays += 1;
    }
    attendanceRows.set(row.userId, item);
  }

  for (const user of users) {
    const userId = user._id.toString();

    monthlyEmployeeRows.set(userId, {
      id: userId,
      employeeName: user.fullName,
      employeeEmail: user.email,
      attendanceDays: 0,
      completedAttendanceDays: 0,
      leaveDays: 0,
        leaveRequests: 0,
        taskCount: 0,
        completedTaskCount: 0,
        taskTitles: new Set<string>(),
        dailyRows: monthDates.map((date) => ({
          attendanceStatus: "Not Marked",
          checkInAt: "Not marked",
          checkOutAt: "Not marked",
          date,
          dsrSummary: "",
          projectNames: new Set<string>(),
        })),
        dsrRows: [],
        taskRows: [],
      });
    }

  for (const row of attendance) {
      const item = monthlyEmployeeRows.get(row.userId);
      if (!item) {
        continue;
      }

      item.attendanceDays += 1;
      if (row.status === "COMPLETED") {
        item.completedAttendanceDays += 1;
      }

      const dailyRow = item.dailyRows.find((entry) => entry.date === row.dateKey);
      if (dailyRow) {
        dailyRow.attendanceStatus = row.status === "COMPLETED" ? "Present + Checkout" : "Present";
        dailyRow.checkInAt = formatDateTime(row.checkInAt);
        dailyRow.checkOutAt = formatDateTime(row.checkOutAt);
      }
    }

  for (const leave of leaves) {
      const item = monthlyEmployeeRows.get(leave.userId);
      if (!item) {
      continue;
    }

    const overlapDays = getDateRangeOverlapDays({
      endDate: leave.endDate,
      rangeEnd: today,
      rangeStart: monthStart,
      startDate: leave.startDate,
    });

    if (overlapDays === 0) {
      continue;
    }

      item.leaveRequests += 1;
      if (leave.status === "APPROVED") {
        item.leaveDays += overlapDays;

        for (const dailyRow of item.dailyRows) {
          if (dailyRow.date >= leave.startDate && dailyRow.date <= leave.endDate && dailyRow.attendanceStatus === "Not Marked") {
            dailyRow.attendanceStatus = "On Leave";
          }
        }
      }
    }

  for (const task of tasks) {
      if (task.dueDate.slice(0, 7) !== currentMonthKey) {
      continue;
    }

    const item = monthlyEmployeeRows.get(task.assignedUserId);
    if (!item) {
      continue;
    }

    item.taskCount += 1;
      if (task.status === "COMPLETED") {
        item.completedTaskCount += 1;
      }
      item.taskTitles.add(task.title);
      item.taskRows.push({
        dueDate: task.dueDate,
        id: task._id.toString(),
        priority: task.priority ?? "MEDIUM",
        status: task.status,
        title: task.title,
      });
    }

  for (const update of dsrRows) {
      const item = monthlyEmployeeRows.get(update.userId);
      if (!item) {
        continue;
      }

      const projectName = update.projectId ? projectMap.get(update.projectId) ?? "General" : "General";
      item.dsrRows.push({
        accomplishments: update.accomplishments,
        blockers: update.blockers ?? "",
        id: update._id.toString(),
        nextPlan: update.nextPlan ?? "",
        projectName,
        summary: update.summary,
        workDate: update.workDate,
      });

      const dailyRow = item.dailyRows.find((entry) => entry.date === update.workDate);
      if (dailyRow) {
        dailyRow.projectNames.add(projectName);
        dailyRow.dsrSummary = update.summary;
      }
    }

  const monthlyReportRows = Array.from(monthlyEmployeeRows.values())
    .map((row) => ({
      attendanceDays: row.attendanceDays,
      completedAttendanceDays: row.completedAttendanceDays,
      completedTaskCount: row.completedTaskCount,
      employeeEmail: row.employeeEmail,
      employeeName: row.employeeName,
      id: row.id,
      leaveDays: row.leaveDays,
      leaveRequests: row.leaveRequests,
      taskCount: row.taskCount,
      taskTitles: Array.from(row.taskTitles).slice(0, 4),
    }))
    .sort(
      (left, right) =>
        right.attendanceDays - left.attendanceDays ||
        right.taskCount - left.taskCount ||
        left.employeeName.localeCompare(right.employeeName),
    );

  return {
    summaryCards: [
      { label: "Team Size", value: String(users.length), detail: "Employees included in this monthly report scope." },
      {
        label: "Attendance Days",
        value: String(monthlyReportRows.reduce((total, row) => total + row.attendanceDays, 0)),
        detail: `${formatMonthYearLabel(currentMonthKey)} attendance entries marked so far.`,
      },
      {
        label: "Leave Days",
        value: String(monthlyReportRows.reduce((total, row) => total + row.leaveDays, 0)),
        detail: "Approved leave days counted inside the current month.",
      },
      {
        label: "Monthly Tasks",
        value: String(monthlyReportRows.reduce((total, row) => total + row.taskCount, 0)),
        detail: "Tasks with due dates in the current month.",
      },
    ],
    weeklySummaryCards: buildWeeklySummaryCards({
      attendanceRows: attendance.filter((row) => row.dateKey >= weekStart),
      dsrRows,
      leaveRows: leaves.filter((leave) => leave.startDate >= weekStart || leave.endDate >= weekStart),
      taskRows: tasks,
      activePeopleCount: users.length,
    }),
    calendarItems: buildCalendarItems({ leaves, tasks, userMap }).slice(0, 10),
      performanceRows: await buildPerformanceRows(scopedIds),
    attendanceRows: Array.from(attendanceRows.values()).sort((left, right) => left.employeeName.localeCompare(right.employeeName)),
    leaveRows: leaves.map((leave) => ({
          id: leave._id.toString(),
          employeeId: leave.userId,
          employeeName: userMap.get(leave.userId)?.fullName ?? "Unknown employee",
          employeeEmail: userMap.get(leave.userId)?.email ?? "",
          leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        requestedDays: getDateRangeDays(leave.startDate, leave.endDate),
          reason: leave.reason,
          status: leave.status,
          updatedAt: formatDateTime(leave.updatedAt),
        })),
    taskRows: tasks.map((task) => mapTaskRow(task, new Map(users.map((user) => [user._id.toString(), user.fullName])))),
    monthLabel: formatMonthYearLabel(currentMonthKey),
    monthlyEmployeeRows: monthlyReportRows,
    monthlyEmployeeReports: Array.from(monthlyEmployeeRows.values())
      .map((row) => ({
        attendanceDays: row.attendanceDays,
        completedAttendanceDays: row.completedAttendanceDays,
        completedTaskCount: row.completedTaskCount,
        dailyRows: row.dailyRows.map((dailyRow) => ({
          attendanceStatus: dailyRow.attendanceStatus,
          checkInAt: dailyRow.checkInAt,
          checkOutAt: dailyRow.checkOutAt,
          date: dailyRow.date,
          dsrSummary: dailyRow.dsrSummary || "No DSR submitted",
          projectNames: Array.from(dailyRow.projectNames),
        })),
        dsrRows: row.dsrRows.sort((left, right) => right.workDate.localeCompare(left.workDate)),
        employeeEmail: row.employeeEmail,
        employeeName: row.employeeName,
        id: row.id,
        leaveDays: row.leaveDays,
        leaveRequests: row.leaveRequests,
        taskCount: row.taskCount,
        taskRows: row.taskRows.sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
      }))
      .sort((left, right) => left.employeeName.localeCompare(right.employeeName)),
  };
}

export async function getSettingsPageData(session: AuthenticatedSession): Promise<SettingsPageData> {
  await connectDb();

  const currentYear = new Date().getFullYear();
  const [settings, holidays] = await Promise.all([
    SettingModel.findOne({ key: "company" }).lean(),
    HolidayModel.find({ year: currentYear }).sort({ date: 1 }).lean(),
  ]);

  return {
    canManageCompany: session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER",
    companyName: settings?.companyName ?? "Mindaptix CRM",
    currentUserEmail: session.user.email,
    currentUserName: session.user.fullName,
    currentUserRoleLabel: session.user.role === "SUPER_ADMIN" ? "Super Admin" : session.user.role === "MANAGER" ? "Admin" : formatLabel(session.user.role),
    workStart: settings?.workStart ?? "09:00",
    workEnd: settings?.workEnd ?? "18:00",
    leavePolicy: settings?.leavePolicy ?? "Paid Leave and Sick Leave are available for approved requests.",
    workingDays: readNumberLike(toRecord(settings).workingDays) ?? 26,
    salaryDay: readNumberLike(toRecord(settings).salaryDay) ?? 1,
    lateGraceMinutes: readNumberLike(toRecord(settings).lateGraceMinutes) ?? 15,
    officeLatitude: readNumberLike(toRecord(settings).officeLatitude) ?? null,
    officeLongitude: readNumberLike(toRecord(settings).officeLongitude) ?? null,
    geoFenceRadiusMeters: readNumberLike(toRecord(settings).geoFenceRadiusMeters) ?? 200,
    geoFenceEnabled: Boolean(toRecord(settings).geoFenceEnabled ?? false),
    holidays: holidays.map((h) => ({
      id: h._id.toString(),
      name: h.name,
      date: h.date,
      year: h.year,
      type: h.type,
      description: h.description ?? "",
    })),
  };
}

function getLast3MonthKeys(): string[] {
  const keys: string[] = [];
  const date = new Date();
  for (let i = 0; i < 3; i++) {
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    date.setUTCMonth(date.getUTCMonth() - 1);
  }
  return keys; // [current, prev1, prev2]
}

export async function getPayrollPageData(session: AuthenticatedSession): Promise<PayrollPageData> {
  await connectDb();

  const today = getTodayDate();
  const currentMonthKey = today.slice(0, 7);
  const last3Months = getLast3MonthKeys();

  if (session.user.role === "EMPLOYEE") {
    const userId = session.user.id;
    const [myUser, mySalary, myPayslips] = await Promise.all([
      UserModel.findById(userId, { fullName: 1, email: 1 }).lean(),
      SalaryModel.findOne({ userId, status: "ACTIVE" }).lean(),
      PayslipModel.find({ userId, monthKey: { $in: last3Months } }).sort({ monthKey: -1 }).lean(),
    ]);

    const gross = mySalary
      ? mySalary.basicSalary + mySalary.hra + mySalary.transportAllowance + mySalary.medicalAllowance + mySalary.otherAllowances
      : 0;
    const net = mySalary ? Math.max(0, gross - mySalary.tds - mySalary.providentFund - mySalary.otherDeductions) : 0;
    const thisMonthPayslip = myPayslips.find((p) => p.monthKey === currentMonthKey);

    const mapPayslip = (p: (typeof myPayslips)[number]) => ({
      id: p._id.toString(),
      userId: p.userId,
      employeeName: myUser?.fullName ?? "You",
      employeeEmail: myUser?.email ?? "",
      monthKey: p.monthKey,
      basicSalary: p.basicSalary,
      hra: p.hra,
      transportAllowance: p.transportAllowance,
      medicalAllowance: p.medicalAllowance,
      otherAllowances: p.otherAllowances,
      grossSalary: p.grossSalary,
      tds: p.tds,
      providentFund: p.providentFund,
      leaveDays: p.leaveDays,
      leaveDeduction: p.leaveDeduction,
      lateDays: p.lateDays,
      lateDeduction: p.lateDeduction,
      otherDeductions: p.otherDeductions,
      totalDeductions: p.totalDeductions,
      netSalary: p.netSalary,
      presentDays: p.presentDays,
      workingDays: p.workingDays,
      status: p.status,
      paidOn: p.paidOn ?? "",
      note: p.note ?? "",
    });

    return {
      summaryCards: [
        { label: "Gross Salary", value: formatCurrency(gross), detail: "Your current monthly gross." },
        { label: "Net Salary", value: formatCurrency(net), detail: "After all deductions." },
        { label: "Total Payslips", value: String(myPayslips.length), detail: "All payslips generated for you." },
        { label: "This Month", value: thisMonthPayslip?.status ?? "Not Generated", detail: `Payslip status for ${currentMonthKey}.` },
      ],
      salaryStructures: mySalary && myUser
        ? [{
            id: mySalary._id.toString(),
            userId,
            employeeName: myUser.fullName,
            employeeEmail: myUser.email,
            basicSalary: mySalary.basicSalary,
            hra: mySalary.hra,
            transportAllowance: mySalary.transportAllowance,
            medicalAllowance: mySalary.medicalAllowance,
            otherAllowances: mySalary.otherAllowances,
            grossSalary: gross,
            tds: mySalary.tds,
            providentFund: mySalary.providentFund,
            otherDeductions: mySalary.otherDeductions,
            netSalary: net,
            effectiveFrom: mySalary.effectiveFrom ?? "",
            status: mySalary.status ?? "ACTIVE",
            note: mySalary.note ?? "",
          }]
        : [],
      payslips: myPayslips.map(mapPayslip),
      employeeOptions: [],
      selectedMonthKey: currentMonthKey,
      availableMonthKeys: last3Months,
    };
  }

  const [employees, salaryStructures, payslips] = await Promise.all([
    UserModel.find({ role: { $in: ["EMPLOYEE", "MANAGER"] }, status: "ACTIVE" }, { fullName: 1, email: 1 }).sort({ fullName: 1 }).lean(),
    SalaryModel.find({ status: "ACTIVE" }).lean(),
    PayslipModel.find({ monthKey: { $in: last3Months } }).sort({ monthKey: -1 }).lean(),
  ]);

  const salaryMap = new Map(salaryStructures.map((s) => [s.userId, s]));
  const userMap = new Map(employees.map((e) => [e._id.toString(), e]));

  const totalGross = salaryStructures.reduce((sum, s) => sum + s.basicSalary + s.hra + s.transportAllowance + s.medicalAllowance + s.otherAllowances, 0);
  const totalNet = payslips.filter((p) => p.status === "GENERATED" || p.status === "PAID").reduce((sum, p) => sum + p.netSalary, 0);
  const paidCount = payslips.filter((p) => p.status === "PAID").length;

  return {
    summaryCards: [
      { label: "Total Employees", value: String(employees.length), detail: "Active employees on payroll." },
      { label: "Monthly Gross", value: formatCurrency(totalGross), detail: "Total gross salary for all employees." },
      { label: "Payslips This Month", value: String(payslips.length), detail: `${paidCount} paid, ${payslips.length - paidCount} pending.` },
      { label: "Net Payable", value: formatCurrency(totalNet), detail: `Net salary processed for ${currentMonthKey}.` },
    ],
    salaryStructures: employees.map((emp) => {
      const s = salaryMap.get(emp._id.toString());
      const gross = s ? s.basicSalary + s.hra + s.transportAllowance + s.medicalAllowance + s.otherAllowances : 0;
      const net = s ? gross - s.tds - s.providentFund - s.otherDeductions : 0;
      return {
        id: s ? s._id.toString() : emp._id.toString(),
        userId: emp._id.toString(),
        employeeName: emp.fullName,
        employeeEmail: emp.email,
        basicSalary: s?.basicSalary ?? 0,
        hra: s?.hra ?? 0,
        transportAllowance: s?.transportAllowance ?? 0,
        medicalAllowance: s?.medicalAllowance ?? 0,
        otherAllowances: s?.otherAllowances ?? 0,
        grossSalary: gross,
        tds: s?.tds ?? 0,
        providentFund: s?.providentFund ?? 0,
        otherDeductions: s?.otherDeductions ?? 0,
        netSalary: Math.max(0, net),
        effectiveFrom: s?.effectiveFrom ?? "",
        status: s?.status ?? "NOT_SET",
        note: s?.note ?? "",
      };
    }),
    payslips: payslips.map((p) => {
      const user = userMap.get(p.userId);
      return {
        id: p._id.toString(),
        userId: p.userId,
        employeeName: user?.fullName ?? "Unknown",
        employeeEmail: user?.email ?? "",
        monthKey: p.monthKey,
        basicSalary: p.basicSalary,
        hra: p.hra,
        transportAllowance: p.transportAllowance,
        medicalAllowance: p.medicalAllowance,
        otherAllowances: p.otherAllowances,
        grossSalary: p.grossSalary,
        tds: p.tds,
        providentFund: p.providentFund,
        leaveDays: p.leaveDays,
        leaveDeduction: p.leaveDeduction,
        lateDays: p.lateDays,
        lateDeduction: p.lateDeduction,
        otherDeductions: p.otherDeductions,
        totalDeductions: p.totalDeductions,
        netSalary: p.netSalary,
        presentDays: p.presentDays,
        workingDays: p.workingDays,
        status: p.status,
        paidOn: p.paidOn ?? "",
        note: p.note ?? "",
      };
    }),
    employeeOptions: employees.map((e) => ({ id: e._id.toString(), label: e.fullName })),
    selectedMonthKey: currentMonthKey,
    availableMonthKeys: last3Months,
  };
}

export async function getExpensesPageData(session: AuthenticatedSession): Promise<ExpensePageData> {
  await connectDb();

  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  const query = isAdmin ? {} : { userId: session.user.id };

  const [expenses, users] = await Promise.all([
    ExpenseModel.find(query).sort({ createdAt: -1 }).limit(100).lean(),
    isAdmin ? UserModel.find({}, { fullName: 1, email: 1 }).lean() : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const totalPending = expenses.filter((e) => e.status === "PENDING").length;
  const totalApproved = expenses.filter((e) => e.status === "APPROVED" || e.status === "PAID").reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = expenses.filter((e) => e.status === "PENDING").reduce((sum, e) => sum + e.amount, 0);

  return {
    summaryCards: [
      { label: "Pending Review", value: String(totalPending), detail: "Expense claims awaiting approval." },
      { label: "Approved Amount", value: formatCurrency(totalApproved), detail: "Total approved expenses." },
      { label: "Pending Amount", value: formatCurrency(pendingAmount), detail: "Total amount in pending claims." },
    ],
    expenses: expenses.map((e) => {
      const user = isAdmin ? userMap.get(e.userId) : null;
      return {
        id: e._id.toString(),
        userId: e.userId,
        employeeName: user?.fullName ?? session.user.fullName,
        employeeEmail: user?.email ?? session.user.email,
        title: e.title,
        category: e.category,
        amount: e.amount,
        expenseDate: e.expenseDate,
        description: e.description ?? "",
        receiptUrl: e.receiptUrl ?? "",
        receiptName: e.receiptName ?? "",
        status: e.status,
        reviewNote: e.reviewNote ?? "",
        paidOn: e.paidOn ?? "",
        createdAt: formatDateTime(e.createdAt),
      };
    }),
    canReview: isAdmin,
  };
}

export async function getAnnouncementsPageData(session: AuthenticatedSession): Promise<AnnouncementsPageData> {
  await connectDb();

  const today = getTodayDate();
  const announcements = await AnnouncementModel.find({
    $or: [{ expiresAt: null }, { expiresAt: { $gte: today } }],
  }).sort({ isPinned: -1, createdAt: -1 }).limit(50).lean();

  return {
    announcements: announcements.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      body: a.body,
      type: a.type,
      isPinned: a.isPinned ?? false,
      expiresAt: a.expiresAt ?? "",
      createdByName: a.createdByName,
      createdAt: formatDateTime(a.createdAt),
    })),
    canManage: session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER",
  };
}

export async function getPaymentsPageData(session: AuthenticatedSession): Promise<PaymentsPageData> {
  const canManage = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  await connectDb();

  const today = getTodayDate();

  // Fetch projects for client name / project name suggestions in the payment form
  const projectsForSuggestions = await ProjectModel.find(
    {},
    { name: 1, clientName: 1 },
  ).sort({ name: 1 }).lean();

  const projectSuggestions = projectsForSuggestions
    .filter((p) => (p as unknown as { clientName?: string }).clientName || p.name)
    .map((p) => ({
      clientName: String((p as unknown as { clientName?: string }).clientName ?? ""),
      projectName: p.name,
    }));

  // Fetch all payment records — admin sees all, no scope filter
  const rawPayments = await SalesPaymentModel.find(
    {},
    { salesUserId: 1, clientName: 1, projectName: 1, invoiceNumber: 1, amount: 1, receivedAmount: 1, dueDate: 1, receivedDate: 1, status: 1, note: 1, createdAt: 1 },
  )
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  // Auto-mark overdue in memory (don't save to DB on every read — that's done lazily)
  const creatorIds = Array.from(new Set(rawPayments.map((p) => p.salesUserId).filter(Boolean)));
  const creatorUsers = creatorIds.length
    ? await UserModel.find({ _id: { $in: creatorIds } }, { fullName: 1 }).lean()
    : [];
  const creatorMap = new Map(creatorUsers.map((u) => [u._id.toString(), u.fullName]));

  const payments: ClientPaymentEntry[] = rawPayments.map((p) => {
    const amount = Number(p.amount ?? 0);
    const receivedAmount = Number(p.receivedAmount ?? 0);
    const balanceDue = Math.max(amount - receivedAmount, 0);
    // Auto-resolve status for display
    let status = p.status as string;
    if (status === "PENDING" && p.dueDate && p.dueDate < today) {
      status = "OVERDUE";
    }

    return {
      id: p._id.toString(),
      clientName: (p as unknown as { clientName?: string }).clientName ?? "",
      projectName: (p as unknown as { projectName?: string }).projectName ?? "",
      invoiceNumber: p.invoiceNumber ?? "",
      totalAmount: amount,
      receivedAmount,
      balanceDue,
      dueDate: p.dueDate ?? "",
      receivedDate: p.receivedDate ?? "",
      status,
      note: p.note ?? "",
      createdByUserId: p.salesUserId,
      createdByName: creatorMap.get(p.salesUserId) ?? "Unknown",
      createdAt: formatDateTime(p.createdAt),
    };
  });

  const totalCollected = payments.filter((p) => p.status === "PAID" || p.receivedAmount > 0).reduce((sum, p) => sum + p.receivedAmount, 0);
  const totalPending = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.balanceDue, 0);
  const totalOverdue = payments.filter((p) => p.status === "OVERDUE").reduce((sum, p) => sum + p.balanceDue, 0);
  const totalBalance = payments.filter((p) => p.status !== "PAID").reduce((sum, p) => sum + p.balanceDue, 0);
  const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;
  const paidCount = payments.filter((p) => p.status === "PAID").length;
  const partialCount = payments.filter((p) => p.status === "PARTIAL").length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  return {
    payments,
    canManage,
    totalCollected,
    totalPending,
    totalOverdue,
    totalBalance,
    overdueCount,
    paidCount,
    partialCount,
    pendingCount,
    projectSuggestions,
  };
}

export async function getLeaveBalanceData(session: AuthenticatedSession): Promise<LeaveBalanceEntry[]> {
  await connectDb();

  const currentYear = new Date().getFullYear();
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  const userIds = isAdmin
    ? (await UserModel.find({ status: "ACTIVE" }, { _id: 1 }).lean()).map((u) => u._id.toString())
    : [session.user.id];

  const [balances, users] = await Promise.all([
    LeaveBalanceModel.find({ userId: { $in: userIds }, year: currentYear }).lean(),
    UserModel.find({ _id: { $in: userIds } }, { fullName: 1, email: 1 }).lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const balanceMap = new Map(balances.map((b) => [b.userId, b]));

  return userIds.map((userId) => {
    const b = balanceMap.get(userId);
    const user = userMap.get(userId);
    return {
      id: b ? b._id.toString() : userId,
      userId,
      employeeName: user?.fullName ?? "Unknown",
      employeeEmail: user?.email ?? "",
      year: currentYear,
      paidLeaveTotal: b?.paidLeaveTotal ?? 12,
      paidLeaveUsed: b?.paidLeaveUsed ?? 0,
      paidLeaveRemaining: (b?.paidLeaveTotal ?? 12) - (b?.paidLeaveUsed ?? 0),
      sickLeaveTotal: b?.sickLeaveTotal ?? 6,
      sickLeaveUsed: b?.sickLeaveUsed ?? 0,
      sickLeaveRemaining: (b?.sickLeaveTotal ?? 6) - (b?.sickLeaveUsed ?? 0),
      casualLeaveTotal: b?.casualLeaveTotal ?? 8,
      casualLeaveUsed: b?.casualLeaveUsed ?? 0,
      casualLeaveRemaining: (b?.casualLeaveTotal ?? 8) - (b?.casualLeaveUsed ?? 0),
      compOffEarned: b?.compOffEarned ?? 0,
      compOffUsed: b?.compOffUsed ?? 0,
      compOffRemaining: (b?.compOffEarned ?? 0) - (b?.compOffUsed ?? 0),
    };
  });
}

export async function getEmployeeDetailData(
  session: AuthenticatedSession,
  employeeId: string,
): Promise<EmployeeDetailData> {
  await connectDb();

  const canViewSensitive = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  const today = getTodayDate();
  const monthStart = `${today.slice(0, 7)}-01`;
  const currentYear = today.slice(0, 4);
  const yearStart = `${currentYear}-01-01`;

  const targetUser = await UserModel.findById(employeeId).lean();
  if (!targetUser) throw new Error("Employee not found");

  const [managerUser, todayAttendance, todayLeave, projects, allPayments] = await Promise.all([
    targetUser.managerId
      ? UserModel.findById(targetUser.managerId, { fullName: 1 }).lean()
      : Promise.resolve(null),
    AttendanceModel.findOne({ userId: employeeId, dateKey: today }, { status: 1 }).lean(),
    LeaveRequestModel.findOne({
      userId: employeeId,
      status: "APPROVED",
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).lean(),
    ProjectModel.find(
      { assignedUserIds: employeeId },
      { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1, assignedUserIds: 1, createdByUserId: 1 },
    )
      .sort({ createdAt: -1 })
      .lean(),
    SalesPaymentModel.find(
      {},
      { clientName: 1, projectName: 1, invoiceNumber: 1, amount: 1, receivedAmount: 1, dueDate: 1, status: 1 },
    ).lean(),
  ]);

  let todayStatus = "Absent";
  if (todayAttendance) todayStatus = "Present";
  else if (todayLeave) todayStatus = "On Leave";

  const projectIds = projects.map((p) => p._id.toString());
  const allAssigneeIds = [...new Set(projects.flatMap((p) => p.assignedUserIds ?? []))];

  const [
    assigneeUsers,
    dsrEntries,
    monthlyAttendance,
    leaveHistory,
    leaveBalance,
    activeSalary,
    recentPayslipsRaw,
    approvedLeavesThisMonth,
  ] = await Promise.all([
    allAssigneeIds.length
      ? UserModel.find({ _id: { $in: allAssigneeIds } }, { fullName: 1 }).lean()
      : Promise.resolve([]),
    projectIds.length
      ? DailyUpdateModel.find(
          { userId: employeeId, projectId: { $in: projectIds } },
          { projectId: 1, workDate: 1, summary: 1, accomplishments: 1, blockers: 1, nextPlan: 1 },
        )
          .sort({ workDate: -1 })
          .lean()
      : Promise.resolve([]),
    AttendanceModel.find(
      { userId: employeeId, dateKey: { $gte: monthStart, $lte: today } },
      { dateKey: 1, status: 1, isLate: 1 },
    ).lean(),
    LeaveRequestModel.find(
      { userId: employeeId, startDate: { $gte: yearStart } },
      { leaveType: 1, startDate: 1, endDate: 1, requestedDays: 1, reason: 1, status: 1 },
    )
      .sort({ createdAt: -1 })
      .lean(),
    LeaveBalanceModel.findOne({ userId: employeeId, year: Number(currentYear) }).lean(),
    canViewSensitive
      ? SalaryModel.findOne(
          { userId: employeeId, status: "ACTIVE" },
          { basicSalary: 1, hra: 1, transportAllowance: 1, medicalAllowance: 1, otherAllowances: 1, tds: 1, providentFund: 1, otherDeductions: 1, effectiveFrom: 1, status: 1 },
        ).lean()
      : Promise.resolve(null),
    canViewSensitive
      ? PayslipModel.find(
          { userId: employeeId },
          { monthKey: 1, netSalary: 1, grossSalary: 1, totalDeductions: 1, presentDays: 1, workingDays: 1, status: 1, paidOn: 1 },
        )
          .sort({ monthKey: -1 })
          .limit(6)
          .lean()
      : Promise.resolve([]),
    LeaveRequestModel.find({
      userId: employeeId,
      status: "APPROVED",
      startDate: { $lte: today },
      endDate: { $gte: monthStart },
    }).lean(),
  ]);

  const assigneeMap = new Map(assigneeUsers.map((u) => [u._id.toString(), u.fullName]));

  const leaveDaysThisMonth = approvedLeavesThisMonth.reduce((sum, leave) => {
    const overlapStart = leave.startDate > monthStart ? leave.startDate : monthStart;
    const overlapEnd = leave.endDate < today ? leave.endDate : today;
    return overlapEnd >= overlapStart ? sum + getDateRangeDays(overlapStart, overlapEnd) : sum;
  }, 0);

  const projectEntries: EmployeeDetailProjectEntry[] = projects.map((project) => {
    const projectId = project._id.toString();
    const projectName = project.name.toLowerCase();

    const projectDsr = dsrEntries
      .filter((d) => d.projectId === projectId)
      .slice(0, 15)
      .map((d) => ({
        id: d._id.toString(),
        workDate: String(d.workDate ?? ""),
        summary: String(d.summary ?? ""),
        accomplishments: String(d.accomplishments ?? ""),
        blockers: String(d.blockers ?? ""),
        nextPlan: String(d.nextPlan ?? ""),
      }));

    const projectPayments = allPayments
      .filter((p) => String((p as Record<string, unknown>).projectName ?? "").toLowerCase() === projectName)
      .map((p) => {
        const amount = Number(p.amount ?? 0);
        const received = Number(p.receivedAmount ?? 0);
        let status = String(p.status ?? "PENDING");
        if (status === "PENDING" && p.dueDate && String(p.dueDate) < today) status = "OVERDUE";
        return {
          id: p._id.toString(),
          clientName: String((p as Record<string, unknown>).clientName ?? ""),
          invoiceNumber: String(p.invoiceNumber ?? ""),
          totalAmount: amount,
          receivedAmount: received,
          balanceDue: Math.max(amount - received, 0),
          dueDate: String(p.dueDate ?? ""),
          status,
        };
      });

    return {
      id: projectId,
      name: project.name,
      summary: String(project.summary ?? ""),
      status: String(project.status ?? "PLANNING"),
      priority: String(project.priority ?? "MEDIUM"),
      dueDate: project.dueDate ? formatDate(project.dueDate) : "",
      techStack: (project.techStack ?? []) as string[],
      assignedUserNames: (project.assignedUserIds ?? [])
        .map((id) => assigneeMap.get(String(id)) ?? "")
        .filter(Boolean),
      createdByUserId: String(project.createdByUserId ?? ""),
      dsrEntries: projectDsr,
      payments: projectPayments,
    };
  });

  let salary: EmployeeDetailSalary | null = null;
  if (activeSalary) {
    const gross =
      Number(activeSalary.basicSalary ?? 0) +
      Number(activeSalary.hra ?? 0) +
      Number(activeSalary.transportAllowance ?? 0) +
      Number(activeSalary.medicalAllowance ?? 0) +
      Number(activeSalary.otherAllowances ?? 0);
    const deductions =
      Number(activeSalary.tds ?? 0) +
      Number(activeSalary.providentFund ?? 0) +
      Number(activeSalary.otherDeductions ?? 0);
    salary = {
      basicSalary: Number(activeSalary.basicSalary ?? 0),
      hra: Number(activeSalary.hra ?? 0),
      transportAllowance: Number(activeSalary.transportAllowance ?? 0),
      medicalAllowance: Number(activeSalary.medicalAllowance ?? 0),
      otherAllowances: Number(activeSalary.otherAllowances ?? 0),
      grossSalary: gross,
      tds: Number(activeSalary.tds ?? 0),
      providentFund: Number(activeSalary.providentFund ?? 0),
      otherDeductions: Number(activeSalary.otherDeductions ?? 0),
      netSalary: Math.max(gross - deductions, 0),
      effectiveFrom: String(activeSalary.effectiveFrom ?? ""),
      status: String(activeSalary.status ?? "ACTIVE"),
    };
  }

  const attendance: EmployeeDetailAttendance = {
    monthLabel: today.slice(0, 7),
    daysPresent: monthlyAttendance.length,
    daysCompleted: monthlyAttendance.filter((a) => a.status === "COMPLETED").length,
    daysOnLeave: leaveDaysThisMonth,
    lateCount: monthlyAttendance.filter((a) => a.isLate).length,
    totalWorkingDays: getDateRangeDays(monthStart, today),
  };

  const leaveHistoryEntries: EmployeeDetailLeaveEntry[] = leaveHistory.map((leave) => ({
    id: leave._id.toString(),
    leaveType: String(leave.leaveType ?? "PAID"),
    startDate: String(leave.startDate ?? ""),
    endDate: String(leave.endDate ?? ""),
    requestedDays: getDateRangeDays(String(leave.startDate ?? ""), String(leave.endDate ?? "")),
    reason: String(leave.reason ?? ""),
    status: String(leave.status ?? "PENDING"),
  }));

  const recentPayslips: EmployeeDetailPayslip[] = recentPayslipsRaw.map((p) => ({
    id: p._id.toString(),
    monthKey: String(p.monthKey ?? ""),
    netSalary: Number(p.netSalary ?? 0),
    grossSalary: Number(p.grossSalary ?? 0),
    totalDeductions: Number(p.totalDeductions ?? 0),
    presentDays: Number(p.presentDays ?? 0),
    workingDays: Number(p.workingDays ?? 26),
    status: String(p.status ?? "DRAFT"),
    paidOn: String(p.paidOn ?? ""),
  }));

  const employee: EmployeeDirectoryEntry = {
    id: targetUser._id.toString(),
    fullName: String(targetUser.fullName ?? ""),
    email: String(targetUser.email ?? ""),
    phone: String(targetUser.phone ?? ""),
    joiningDate: String(targetUser.joiningDate ?? ""),
    managerId: String(targetUser.managerId ?? ""),
    managerName: String(managerUser?.fullName ?? ""),
    techStack: (targetUser.techStack ?? []) as string[],
    todayStatus,
    role: (targetUser.role ?? "EMPLOYEE") as EmployeeDirectoryEntry["role"],
    status: (targetUser.status ?? "ACTIVE") as "ACTIVE" | "SUSPENDED",
    projectIds: (targetUser.projectIds ?? []) as string[],
    documentName: String(targetUser.documentName ?? ""),
    documentUrl: String(targetUser.documentUrl ?? ""),
    employeeId: String(targetUser.employeeId ?? ""),
    department: String(targetUser.department ?? ""),
    designation: String(targetUser.designation ?? ""),
    dateOfBirth: String(targetUser.dateOfBirth ?? ""),
    address: String(targetUser.address ?? ""),
    emergencyContact: String(targetUser.emergencyContact ?? ""),
    bankAccountNumber: String(targetUser.bankAccountNumber ?? ""),
    bankName: String(targetUser.bankName ?? ""),
    bankIfscCode: String(targetUser.bankIfscCode ?? ""),
    panNumber: String(targetUser.panNumber ?? ""),
    profilePhotoUrl: String(targetUser.profilePhotoUrl ?? ""),
  };

  return {
    employee,
    salary,
    projects: projectEntries,
    currentMonthAttendance: attendance,
    leaveHistory: leaveHistoryEntries,
    leaveBalance: leaveBalance
      ? {
          paidLeaveTotal: leaveBalance.paidLeaveTotal ?? 12,
          paidLeaveUsed: leaveBalance.paidLeaveUsed ?? 0,
          paidLeaveRemaining: (leaveBalance.paidLeaveTotal ?? 12) - (leaveBalance.paidLeaveUsed ?? 0),
          sickLeaveTotal: leaveBalance.sickLeaveTotal ?? 6,
          sickLeaveUsed: leaveBalance.sickLeaveUsed ?? 0,
          sickLeaveRemaining: (leaveBalance.sickLeaveTotal ?? 6) - (leaveBalance.sickLeaveUsed ?? 0),
          casualLeaveTotal: leaveBalance.casualLeaveTotal ?? 8,
          casualLeaveUsed: leaveBalance.casualLeaveUsed ?? 0,
          casualLeaveRemaining: (leaveBalance.casualLeaveTotal ?? 8) - (leaveBalance.casualLeaveUsed ?? 0),
        }
      : null,
    recentPayslips,
    canViewSensitive,
  };
}

export async function getProjectDetailData(
  session: AuthenticatedSession,
  projectId: string,
): Promise<ProjectDetailData> {
  await connectDb();

  const canView = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  if (!canView) throw new Error("Unauthorized");

  const today = getTodayDate();

  const project = await ProjectModel.findById(
    projectId,
    { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, techStack: 1, assignedUserIds: 1, createdByUserId: 1, closedByEmployeeId: 1, closedByEmployeeAt: 1, clientName: 1, clientBudget: 1 },
  ).lean();
  if (!project) throw new Error("Project not found");

  const assignedIds = (project.assignedUserIds ?? []) as string[];
  const creatorId = String(project.createdByUserId ?? "");

  const [assignedUsers, creatorUser, dsrEntries, allPayments, todayAttendance, activeLeaves] = await Promise.all([
    assignedIds.length
      ? UserModel.find(
          { _id: { $in: assignedIds } },
          { fullName: 1, email: 1, phone: 1, role: 1, designation: 1, department: 1, employeeId: 1 },
        ).lean()
      : Promise.resolve([]),
    creatorId
      ? UserModel.findById(creatorId, { fullName: 1 }).lean()
      : Promise.resolve(null),
    assignedIds.length
      ? DailyUpdateModel.find(
          { userId: { $in: assignedIds }, projectId },
          { userId: 1, workDate: 1, summary: 1, accomplishments: 1, blockers: 1, nextPlan: 1 },
        )
          .sort({ workDate: -1 })
          .lean()
      : Promise.resolve([]),
    SalesPaymentModel.find(
      {},
      { clientName: 1, projectName: 1, invoiceNumber: 1, amount: 1, receivedAmount: 1, dueDate: 1, receivedDate: 1, status: 1, note: 1, salesUserId: 1 },
    ).lean(),
    assignedIds.length
      ? AttendanceModel.find({ userId: { $in: assignedIds }, dateKey: today }, { userId: 1 }).lean()
      : Promise.resolve([]),
    assignedIds.length
      ? LeaveRequestModel.find({
          userId: { $in: assignedIds },
          status: "APPROVED",
          startDate: { $lte: today },
          endDate: { $gte: today },
        }, { userId: 1 }).lean()
      : Promise.resolve([]),
  ]);

  // Resolve payment creator names
  const paymentCreatorIds = [...new Set(allPayments.map((p) => p.salesUserId).filter(Boolean))];
  const paymentCreators = paymentCreatorIds.length
    ? await UserModel.find({ _id: { $in: paymentCreatorIds } }, { fullName: 1 }).lean()
    : [];
  const paymentCreatorMap = new Map(paymentCreators.map((u) => [u._id.toString(), u.fullName]));

  const presentTodayIds = new Set(todayAttendance.map((a) => a.userId));
  const onLeaveTodayIds = new Set(activeLeaves.map((l) => l.userId));

  const assignedEmployees: ProjectDetailEmployeeEntry[] = assignedUsers.map((user) => {
    const userId = user._id.toString();
    let todayStatus = "Absent";
    if (presentTodayIds.has(userId)) todayStatus = "Present";
    else if (onLeaveTodayIds.has(userId)) todayStatus = "On Leave";

    const userDsr = dsrEntries
      .filter((d) => d.userId === userId)
      .slice(0, 20)
      .map((d) => ({
        id: d._id.toString(),
        workDate: String(d.workDate ?? ""),
        summary: String(d.summary ?? ""),
        accomplishments: String(d.accomplishments ?? ""),
        blockers: String(d.blockers ?? ""),
        nextPlan: String(d.nextPlan ?? ""),
      }));

    return {
      id: userId,
      fullName: user.fullName,
      email: user.email,
      phone: String(user.phone ?? ""),
      role: String(user.role ?? "EMPLOYEE"),
      designation: String(user.designation ?? ""),
      department: String(user.department ?? ""),
      employeeId: String(user.employeeId ?? ""),
      todayStatus,
      dsrEntries: userDsr,
    };
  });

  // Match payments by project name
  const projectNameLower = project.name.toLowerCase();
  const payments: ProjectDetailPaymentEntry[] = allPayments
    .filter((p) => String((p as Record<string, unknown>).projectName ?? "").toLowerCase() === projectNameLower)
    .map((p) => {
      const amount = Number(p.amount ?? 0);
      const received = Number(p.receivedAmount ?? 0);
      let status = String(p.status ?? "PENDING");
      if (status === "PENDING" && p.dueDate && String(p.dueDate) < today) status = "OVERDUE";
      return {
        id: p._id.toString(),
        clientName: String((p as Record<string, unknown>).clientName ?? ""),
        invoiceNumber: String(p.invoiceNumber ?? ""),
        totalAmount: amount,
        receivedAmount: received,
        balanceDue: Math.max(amount - received, 0),
        dueDate: String(p.dueDate ?? ""),
        receivedDate: String(p.receivedDate ?? ""),
        status,
        note: String(p.note ?? ""),
        createdByName: paymentCreatorMap.get(p.salesUserId) ?? "Unknown",
      };
    });

  const totalPayment = payments.reduce((s, p) => s + p.totalAmount, 0);
  const totalReceived = payments.reduce((s, p) => s + p.receivedAmount, 0);
  const totalBalance = payments.reduce((s, p) => s + p.balanceDue, 0);

  return {
    id: projectId,
    name: project.name,
    summary: String(project.summary ?? ""),
    status: String(project.status ?? "PLANNING"),
    priority: String(project.priority ?? "MEDIUM"),
    dueDate: project.dueDate ? formatDate(project.dueDate) : "",
    techStack: (project.techStack ?? []) as string[],
    createdByUserId: creatorId,
    createdByName: String(creatorUser?.fullName ?? "Unknown"),
    closedByEmployeeId: String(project.closedByEmployeeId ?? ""),
    closedByEmployeeAt: project.closedByEmployeeAt ? formatDate(project.closedByEmployeeAt) : "",
    clientName: String((project as { clientName?: string }).clientName ?? ""),
    clientBudget: Number((project as { clientBudget?: number }).clientBudget ?? 0),
    assignedEmployees,
    payments,
    totalPayment,
    totalReceived,
    totalBalance,
    dsrTotalCount: dsrEntries.length,
  };
}

function buildSalesWorkspaceData({
  customers,
  deals,
  followUps,
  leads,
  payments,
  targets,
  today,
}: {
  customers: SalesCustomerEntry[];
  deals: SalesDealEntry[];
  followUps: SalesFollowUpEntry[];
  leads: SalesLeadEntry[];
  payments: SalesPaymentEntry[];
  targets: SalesTargetEntry[];
  today: string;
}): SalesWorkspaceData {
  const dueFollowUps = followUps.filter((followUp) => followUp.status === "PENDING" && followUp.followUpDate <= today).length;
  const openDeals = deals.filter((deal) => deal.status === "OPEN").length;
  const pendingPayments = payments.filter((payment) => payment.status === "PENDING" || payment.status === "PARTIAL" || payment.status === "OVERDUE");
  const latestTarget = targets[0] ?? null;
  const leadValue = leads.reduce((sum, lead) => sum + lead.pitchedPrice, 0);
  const openLeadCount = leads.filter((lead) => lead.status !== "WON" && lead.status !== "LOST").length;
  const activeCustomerCount = customers.filter((customer) => customer.status === "ACTIVE" || customer.status === "REPEAT").length;
  const collectionBacklog = pendingPayments.reduce((sum, payment) => sum + Math.max(payment.amount - payment.receivedAmount, 0), 0);

  return {
    summaryCards: [
      { label: "Open Leads", value: String(openLeadCount), detail: "Leads still active in the funnel and not closed yet." },
      { label: "Due Follow-ups", value: String(dueFollowUps), detail: "Pending follow-ups due today or already overdue." },
      { label: "Open Deals", value: String(openDeals), detail: `${activeCustomerCount} active customer account(s) currently linked to sales.` },
      {
        label: "Pending Payments",
        value: String(pendingPayments.length),
        detail: `${formatCurrency(collectionBacklog)} still pending across outstanding invoices.`,
      },
      latestTarget
        ? {
            label: "Target Progress",
            value: `${latestTarget.achievementRate}%`,
            detail: `${latestTarget.monthKey} target ${formatCurrency(latestTarget.achievedAmount)} of ${formatCurrency(latestTarget.targetAmount)}.`,
          }
        : {
            label: "Lead Value",
            value: formatCurrency(leadValue),
            detail: "Total quoted value currently sitting in the lead register.",
          },
    ],
    customers,
    followUps,
    deals,
    payments,
    targets,
  };
}

async function buildUserMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, { fullName: string; email: string }>();
  }

  const users = await UserModel.find({ _id: { $in: uniqueIds } }, { fullName: 1, email: 1 }).lean();
  return new Map(users.map((user) => [user._id.toString(), { fullName: user.fullName, email: user.email }]));
}

async function buildProjectMap(projectIds: string[]) {
  const uniqueIds = Array.from(new Set(projectIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const projects = await ProjectModel.find({ _id: { $in: uniqueIds } }, { name: 1 }).lean();
  return new Map(projects.map((project) => [project._id.toString(), project.name]));
}

async function buildPerformanceRows(userIds: string[]): Promise<PerformanceScoreRow[]> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const today = getTodayDate();
  const weekStart = addDaysToDate(today, -6);
  const scope = inScope(uniqueIds);
  const [users, attendance, tasks, updates] = await Promise.all([
    UserModel.find({ _id: scope }, { fullName: 1, email: 1 }).lean(),
    AttendanceModel.find({ userId: scope, dateKey: { $gte: weekStart, $lte: today } }, { userId: 1, status: 1 }).lean(),
    TaskModel.find({ assignedUserId: scope }, { assignedUserId: 1, status: 1 }).lean(),
    DailyUpdateModel.find({ userId: scope, workDate: { $gte: weekStart, $lte: today } }, { userId: 1 }).lean(),
  ]);

  return users
    .map((user) => {
      const userId = user._id.toString();
      const attendanceRows = attendance.filter((row) => row.userId === userId);
      const userTasks = tasks.filter((task) => task.assignedUserId === userId);
      const dsrCount = updates.filter((update) => update.userId === userId).length;
      const attendanceRate = getRate(attendanceRows.length, 7);
      const taskCompletionRate = getRate(userTasks.filter((task) => task.status === "COMPLETED").length, Math.max(userTasks.length, 1));
      const dsrConsistencyRate = getRate(dsrCount, 7);
      const score = Math.round(attendanceRate * 0.35 + taskCompletionRate * 0.4 + dsrConsistencyRate * 0.25);

      return {
        id: userId,
        employeeName: user.fullName,
        employeeEmail: user.email,
        score,
        attendanceRate,
        taskCompletionRate,
        dsrConsistencyRate,
      };
    })
    .sort((left, right) => right.score - left.score || left.employeeName.localeCompare(right.employeeName));
}

function buildWeeklySummaryCards({
  attendanceRows,
  dsrRows,
  leaveRows,
  taskRows,
  activePeopleCount,
}: {
  attendanceRows: Array<{ status?: string }>;
  dsrRows: Array<{ userId?: string; workDate?: string }>;
  leaveRows: Array<{ status?: string }>;
  taskRows: Array<{ status?: string }>;
  activePeopleCount: number;
}) {
  const completedAttendance = attendanceRows.filter((row) => row.status === "COMPLETED").length;
  const completedTasks = taskRows.filter((task) => task.status === "COMPLETED").length;
  const pendingTasks = taskRows.filter((task) => task.status !== "COMPLETED").length;
  const approvedLeaves = leaveRows.filter((leave) => leave.status === "APPROVED").length;

  return [
    { label: "Attendance", value: `${completedAttendance}/${Math.max(activePeopleCount * 7, 1)}`, detail: "Completed attendance checkouts recorded this week." },
    { label: "DSR", value: String(dsrRows.length), detail: "DSR entries submitted in the last 7 days." },
    { label: "Completed Tasks", value: String(completedTasks), detail: "Tasks marked complete in the current summary scope." },
    { label: "Pending Work", value: String(pendingTasks), detail: "Open tasks still active in the current summary scope." },
    { label: "Approved Leaves", value: String(approvedLeaves), detail: "Leave requests approved in the current summary window." },
  ];
}

function buildCalendarItems({
  leaves,
  tasks,
  userMap,
}: {
  leaves: Array<{ _id: { toString(): string }; userId: string; leaveType?: string; startDate: string; endDate: string; status?: string }>;
  tasks: Array<{ _id: { toString(): string }; title: string; dueDate: string; status?: string; assignedUserId: string }>;
  userMap: Map<string, { fullName: string; email?: string }>;
}) {
  const taskEvents = tasks
    .filter((task) => task.status !== "COMPLETED")
    .map((task) => ({
      id: `task-${task._id.toString()}`,
      title: task.title,
      date: task.dueDate,
      type: task.dueDate < getTodayDate() ? "Overdue Task" : "Task Deadline",
      detail: userMap.get(task.assignedUserId)?.fullName
        ? `${userMap.get(task.assignedUserId)?.fullName} • ${formatLabel(task.status ?? "PENDING")}`
        : formatLabel(task.status ?? "PENDING"),
    }));

  const leaveEvents = leaves.map((leave) => ({
    id: `leave-${leave._id.toString()}`,
    title: userMap.get(leave.userId)?.fullName ?? "Employee Leave",
    date: leave.startDate,
    type: `${formatLabel(leave.leaveType ?? "Leave")} Leave`,
    detail: `${leave.startDate} to ${leave.endDate} • ${formatLabel(leave.status ?? "PENDING")}`,
  }));

  return [...taskEvents, ...leaveEvents].sort((left, right) => left.date.localeCompare(right.date)).slice(0, 8);
}

function mapNotifications(notifications: Array<{ _id: { toString(): string }; title: string; message: string; createdAt?: Date | null; actionUrl?: string }>) {
  return notifications.map((notification) => ({
    id: notification._id.toString(),
    title: notification.title,
    detail: notification.message,
    meta: formatDateTime(notification.createdAt),
    actionUrl: notification.actionUrl ?? "",
  }));
}

function mapTaskRow(task: {
  _id: { toString(): string };
  title: string;
  description: string;
  assignedUserId: string;
  assignedByUserId: string;
  dueDate: string;
  status: string;
  priority?: string;
  labels?: string[];
  attachments?: Array<{ name?: string; url?: string }>;
  comments?: Array<{ _id?: { toString(): string }; userName?: string; role?: string; message?: string; createdAt?: Date | null }>;
}, userMap: Map<string, string>) {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    assignedUserId: task.assignedUserId,
    assignedUserName: userMap.get(task.assignedUserId) ?? "Unknown employee",
    assignedByName: userMap.get(task.assignedByUserId) ?? "Unknown admin",
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority ?? "MEDIUM",
    labels: task.labels ?? [],
    isOverdue: task.status !== "COMPLETED" && task.dueDate < getTodayDate(),
    attachments: mapAttachments(task.attachments),
    comments: (task.comments ?? []).map((comment, index) => ({
      id: comment._id?.toString() ?? `${task._id.toString()}-${index}`,
      userName: comment.userName ?? "Unknown user",
      role: comment.role ?? "USER",
      message: comment.message ?? "",
      createdAt: formatDateTime(comment.createdAt),
    })),
  };
}

function mapAttachments(attachments: Array<{ name?: string; url?: string }> | undefined) {
  return (attachments ?? [])
    .filter((attachment) => attachment?.url)
    .map((attachment) => ({
      name: attachment.name ?? "Attachment",
      url: attachment.url ?? "",
    }));
}

async function getAllActiveEmployeeIds() {
  const users = await UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { _id: 1 }).lean();
  return users.map((user) => user._id.toString());
}

function inScope(userIds: string[]) {
  return userIds.length ? { $in: userIds } : { $in: [] as string[] };
}

function getTodayDate() {
  return formatIndiaDateKey(new Date());
}

function getCurrentTimeKey() {
  return formatIndiaTimeKey(new Date());
}

function addDaysToDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getMonthEndDate(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function getDateRangeDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const differenceInDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return differenceInDays >= 0 ? differenceInDays + 1 : 0;
}

function getDateRangeOverlapDays({
  endDate,
  rangeEnd,
  rangeStart,
  startDate,
}: {
  endDate: string;
  rangeEnd: string;
  rangeStart: string;
  startDate: string;
}) {
  const overlapStart = startDate > rangeStart ? startDate : rangeStart;
  const overlapEnd = endDate < rangeEnd ? endDate : rangeEnd;

  if (overlapEnd < overlapStart) {
    return 0;
  }

  return getDateRangeDays(overlapStart, overlapEnd);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatIndiaDateKey(date);
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "Not marked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not marked";
  }

  return formatIndiaDateTime(date);
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getRate(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function buildAttendanceTrend({
  activeEmployeeIds,
  attendanceRows,
  leaveRows,
  today,
  weekStart,
}: {
  activeEmployeeIds: string[];
  attendanceRows: Array<{ userId: string; dateKey?: string }>;
  leaveRows: Array<{ userId: string; status?: string; startDate: string; endDate: string }>;
  today: string;
  weekStart: string;
}) {
  const uniqueEmployeeIds = Array.from(new Set(activeEmployeeIds));

  return listDateRange(weekStart, today).map((dateKey) => {
    const presentIds = new Set(attendanceRows.filter((row) => row.dateKey === dateKey).map((row) => row.userId));
    const onLeaveIds = new Set(
      leaveRows
        .filter((leave) => leave.status === "APPROVED" && leave.startDate <= dateKey && leave.endDate >= dateKey)
        .map((leave) => leave.userId)
        .filter((userId) => !presentIds.has(userId)),
    );

    return {
      label: formatDayLabel(dateKey),
      present: presentIds.size,
      onLeave: onLeaveIds.size,
      absent: Math.max(uniqueEmployeeIds.length - presentIds.size - onLeaveIds.size, 0),
    };
  });
}

function buildLeaveTrend(leaveRows: Array<{ startDate: string }>, today: string, months = 6) {
  const monthKeys = listMonthRange(today, months);
  const countMap = new Map(monthKeys.map((monthKey) => [monthKey, 0]));

  for (const row of leaveRows) {
    const monthKey = row.startDate.slice(0, 7);
    if (countMap.has(monthKey)) {
      countMap.set(monthKey, (countMap.get(monthKey) ?? 0) + 1);
    }
  }

  return monthKeys.map((monthKey) => ({
    label: formatMonthLabel(monthKey),
    count: countMap.get(monthKey) ?? 0,
  }));
}

function buildDsrTrend({
  activeEmployeeIds,
  dsrRows,
  today,
  weekStart,
}: {
  activeEmployeeIds: string[];
  dsrRows: Array<{ userId: string; workDate?: string }>;
  today: string;
  weekStart: string;
}) {
  const uniqueEmployeeIds = Array.from(new Set(activeEmployeeIds));

  return listDateRange(weekStart, today).map((dateKey) => {
    const submittedIds = new Set(dsrRows.filter((row) => row.workDate === dateKey).map((row) => row.userId));

    return {
      label: formatDayLabel(dateKey),
      submitted: submittedIds.size,
      missing: Math.max(uniqueEmployeeIds.length - submittedIds.size, 0),
    };
  });
}

function buildEmployeeProjectSummaryRows({
  activeEmployees,
  projects,
}: {
  activeEmployees: Array<{ _id: { toString(): string }; fullName: string; email: string }>;
  projects: Array<{ assignedUserIds?: string[]; status?: string }>;
}) {
  return activeEmployees
    .map((employee) => {
      const employeeId = employee._id.toString();
      const assignedProjects = projects.filter((project) => project.assignedUserIds?.includes(employeeId));
      const completedProjects = assignedProjects.filter((project) => project.status === "COMPLETED").length;
      const pendingProjects = assignedProjects.length - completedProjects;

      return {
        id: employeeId,
        employeeName: employee.fullName,
        employeeEmail: employee.email,
        pendingProjects,
        completedProjects,
      };
    })
    .sort(
      (left, right) =>
        right.pendingProjects - left.pendingProjects ||
        right.completedProjects - left.completedProjects ||
        left.employeeName.localeCompare(right.employeeName),
    );
}

function listDateRange(startDateKey: string, endDateKey: string) {
  const dates: string[] = [];
  let current = startDateKey;

  while (current <= endDateKey) {
    dates.push(current);
    current = addDaysToDate(current, 1);
  }

  return dates;
}

function listMonthRange(today: string, months: number) {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - (months - 1));

  const monthKeys: string[] = [];

  for (let index = 0; index < months; index += 1) {
    monthKeys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    date.setUTCMonth(date.getUTCMonth() + 1);
  }

  return monthKeys;
}

function formatDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

function formatMonthYearLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? monthKey
    : date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function resolveProjectTechStack(project: { name?: string; summary?: string; techStack?: string[] }) {
  const explicitTechStack = Array.from(new Set((project.techStack ?? []).filter(Boolean)));

  if (explicitTechStack.length) {
    return explicitTechStack;
  }

  const text = `${project.name ?? ""} ${project.summary ?? ""}`.toLowerCase();

  return SALES_TECH_OPTIONS.filter((option) => {
    const normalized = option.toLowerCase();

    if (normalized === "next.js") {
      return text.includes("next.js") || text.includes("nextjs");
    }

    if (normalized === "node.js") {
      return text.includes("node.js") || text.includes("nodejs");
    }

    if (normalized === "ui/ux design") {
      return text.includes("ui/ux") || text.includes("ui ux") || text.includes("ux design");
    }

    if (normalized === "react native") {
      return text.includes("react native");
    }

    if (normalized === "ai integration") {
      return text.includes("ai integration") || text.includes("artificial intelligence");
    }

    if (normalized === "custom crm") {
      return text.includes("custom crm") || text.includes(" crm");
    }

    if (normalized === "google ads") {
      return text.includes("google ads");
    }

    if (normalized === "meta ads") {
      return text.includes("meta ads") || text.includes("facebook ads");
    }

    if (normalized === "mern") {
      return text.includes("mern");
    }

    return text.includes(normalized);
  });
}




