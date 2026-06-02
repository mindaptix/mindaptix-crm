import "server-only";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { LeaveRequestModel } from "@/database/mongodb/models/leave-request";
import { ProjectModel } from "@/database/mongodb/models/project";
import { SalesLeadModel } from "@/database/mongodb/models/sales-lead";
import { SalesPaymentModel } from "@/database/mongodb/models/sales-payment";
import { TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import type { DashboardListItem, DashboardOverviewData, ExecutiveOverviewSection, UnreadAssignment } from "@/features/dashboard/types";
import type { DashboardDateFilter } from "@/features/dashboard/types";
import { getUnreadAssignmentsForUser } from "@/features/notifications/service";
import {
  addDaysToDate,
  buildOverviewAttendanceTrend,
  buildOverviewCalendarItems,
  buildOverviewDsrTrend,
  buildOverviewEmployeeProjectSummaryRows,
  buildOverviewLeaveTrend,
  buildOverviewPerformanceRows,
  buildOverviewWeeklySummaryCards,
  formatDate,
  formatLabel,
  getDashboardOverviewContext,
  inScope,
} from "@/features/dashboard/shared/overview-support";

export async function buildLeadershipDashboardOverview(
  session: AuthenticatedSession,
  copy: Pick<DashboardOverviewData, "title" | "description">,
  filter?: DashboardDateFilter,
): Promise<DashboardOverviewData> {
  const { notifications, today: realToday } = await getDashboardOverviewContext(session);
  const { anchor, rangeStart, filterLabel, presentLabel, leaveLabel } = resolveDateFilter(filter ?? null, realToday);
  const isLeadership = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  // Run both user queries in parallel instead of sequentially — saves ~100-200ms
  const [activeEmployees, activeSalesUsers] = await Promise.all([
    UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { fullName: 1, email: 1, phone: 1, joiningDate: 1 })
      .sort({ fullName: 1 })
      .lean(),
    isLeadership
      ? UserModel.find({ role: "SALES", status: "ACTIVE" }, { fullName: 1, email: 1, phone: 1, joiningDate: 1 }).sort({ fullName: 1 }).lean()
      : Promise.resolve([]),
  ]);
  const activeStaffUsers = [...activeEmployees, ...activeSalesUsers];
  const employeeIds = activeStaffUsers.map((employee) => employee._id.toString());
  const salesUserIds = activeSalesUsers.map((user) => user._id.toString());
  const employeeMap = new Map(
    activeStaffUsers.map((employee) => [employee._id.toString(), { fullName: employee.fullName, email: employee.email }]),
  );
  const scope = inScope(employeeIds);
  const [todaysAttendance, leaveRows, taskRows, weekAttendance, weekUpdates, projects, salesLeads, operationalTasks, allPayments, rawUnreadAssignments] = await Promise.all([
    AttendanceModel.find({ userId: scope, dateKey: anchor }, { userId: 1 }).lean(),
    LeaveRequestModel.find({ userId: scope }, { userId: 1, leaveType: 1, startDate: 1, endDate: 1, status: 1, reason: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
    TaskModel.find({ assignedUserId: scope }, { title: 1, dueDate: 1, status: 1, assignedUserId: 1, priority: 1, completedAt: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
    AttendanceModel.find({ userId: scope, dateKey: { $gte: rangeStart, $lte: anchor } }, { userId: 1, status: 1, dateKey: 1 }).lean(),
    DailyUpdateModel.find({ userId: scope, workDate: { $gte: rangeStart, $lte: anchor } }, { userId: 1, workDate: 1 }).lean(),
    ProjectModel.find({}, { name: 1, summary: 1, status: 1, priority: 1, assignedUserIds: 1, dueDate: 1, closedByEmployeeId: 1, closedByEmployeeAt: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
    SalesLeadModel.find(
      { salesUserId: inScope(salesUserIds) },
      {
        salesUserId: 1,
        clientName: 1,
        clientPhone: 1,
        clientEmail: 1,
        technologies: 1,
        meetingDate: 1,
        meetingTime: 1,
        budget: 1,
        pitchedPrice: 1,
        deliveryDate: 1,
        dateOfFirstCall: 1,
        dateOfLastCall: 1,
        nextFollowUpDate: 1,
        callbackReminderDate: 1,
        expectedCloseDate: 1,
        createdAt: 1,
      },
    )
      .sort({ createdAt: -1 })
      .lean(),
    TaskModel.find(
      { assignedUserId: inScope([...employeeIds, ...salesUserIds]) },
      { title: 1, description: 1, dueDate: 1, status: 1, assignedUserId: 1, labels: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1 })
      .lean(),
    SalesPaymentModel.find(
      {},
      { salesUserId: 1, clientName: 1, projectName: 1, invoiceNumber: 1, amount: 1, receivedAmount: 1, dueDate: 1, receivedDate: 1, status: 1, createdAt: 1 },
    ).lean(),
    getUnreadAssignmentsForUser(session.user.id),
  ]);
  const filteredAttendanceIds =
    filter?.type === "month"
      ? new Set(weekAttendance.map((row) => row.userId))
      : new Set(todaysAttendance.map((row) => row.userId));
  const onLeaveTodayIds = new Set(
    leaveRows
      .filter((leave) =>
        filter?.type === "month"
          ? leave.status === "APPROVED" && leave.startDate <= anchor && leave.endDate >= rangeStart
          : leave.status === "APPROVED" && leave.startDate <= anchor && leave.endDate >= anchor,
      )
      .map((leave) => leave.userId),
  );
  const presentToday = filteredAttendanceIds.size;
  const onLeaveToday = Array.from(onLeaveTodayIds).filter((userId) => !filteredAttendanceIds.has(userId)).length;
  const absentToday = Math.max(activeStaffUsers.length - presentToday - onLeaveToday, 0);
  const todayLeaveRows = leaveRows.filter((leave) =>
    filter?.type === "month"
      ? leave.status === "APPROVED" && leave.startDate <= anchor && leave.endDate >= rangeStart
      : leave.status === "APPROVED" && leave.startDate <= anchor && leave.endDate >= anchor,
  );
  const currentWindowLeaveRows = leaveRows.filter((leave) => leave.endDate >= rangeStart && leave.startDate <= anchor);
  const currentWindowTaskRows = taskRows.filter((task) => {
    const createdDate = task.createdAt ? formatDate(task.createdAt) : "";
    return !createdDate || isDateInRange(createdDate, rangeStart, anchor);
  });
  const filteredProjects = filter ? projects.filter((project) => isProjectInFilterWindow(project, rangeStart, anchor)) : projects;
  const filteredSalesLeads = filter ? salesLeads.filter((lead) => isSalesLeadInFilterWindow(lead, rangeStart, anchor)) : salesLeads;
  const filteredOperationalTasks = filter
    ? operationalTasks.filter((task) => isDateInRange(task.dueDate, rangeStart, anchor) || isDateLikeInRange(task.createdAt, rangeStart, anchor))
    : operationalTasks;
  const filteredPayments = filter ? allPayments.filter((payment) => isPaymentInFilterWindow(payment, rangeStart, anchor)) : allPayments;
  const pendingProjects = filteredProjects.filter((project) => project.status === "PLANNING" || project.status === "ON_HOLD").length;
  const inProgressProjects = filteredProjects.filter((project) => project.status === "IN_PROGRESS").length;
  const completedProjects = filteredProjects.filter((project) => project.status === "COMPLETED").length;
  const attendanceBreakdown = [
    { label: "Present", value: presentToday, color: "#2563eb" },
    { label: "On Leave", value: onLeaveToday, color: "#f59e0b" },
    { label: "Absent", value: absentToday, color: "#ef4444" },
  ];
  const taskStatusBreakdown = [
    { label: "Pending", value: taskRows.filter((task) => task.status === "PENDING").length, color: "#f59e0b" },
    { label: "In Progress", value: taskRows.filter((task) => task.status === "IN_PROGRESS").length, color: "#3b82f6" },
    { label: "Completed", value: taskRows.filter((task) => task.status === "COMPLETED").length, color: "#10b981" },
  ];
  const projectStatusBreakdown = [
    { label: "Pending", value: pendingProjects, color: "#f97316" },
    { label: "In Progress", value: inProgressProjects, color: "#2563eb" },
    { label: "Completed", value: completedProjects, color: "#10b981" },
  ];
  const attendanceTrend = buildOverviewAttendanceTrend({ activeEmployeeIds: employeeIds, attendanceRows: weekAttendance, leaveRows, today: anchor, weekStart: rangeStart });
  const leaveTrend = buildOverviewLeaveTrend(leaveRows, anchor, 6);
  const dsrTrend = buildOverviewDsrTrend({ activeEmployeeIds: employeeIds, dsrRows: weekUpdates, today: anchor, weekStart: rangeStart });
  const pitchOwners = [
    { id: session.user.id, name: `${session.user.fullName} (Me)`, email: session.user.email },
    ...activeSalesUsers
      .filter((user) => user._id.toString() !== session.user.id)
      .map((user) => ({ id: user._id.toString(), name: user.fullName, email: user.email })),
  ];
  const employeeProjectRows = buildOverviewEmployeeProjectSummaryRows({
    activeEmployees,
    projects: projects.map((project) => ({
      assignedUserIds: project.assignedUserIds ?? [],
      status: project.status,
    })),
  });
  const executiveSections =
    session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER"
      ? buildExecutiveOverviewSections({
          activeEmployees: activeStaffUsers,
          activeSalesUsers,
          presentToday,
          presentUserIds: filteredAttendanceIds,
          onLeaveToday,
          absentToday,
          pitchOwners,
          today: anchor,
          filterLabel,
          isFiltered: Boolean(filter),
          projects: filteredProjects,
          leaveRows,
          salesLeads: filteredSalesLeads,
          allPayments: filteredPayments,
          salesUserMap: new Map(activeSalesUsers.map((user) => [user._id.toString(), user])),
          operationalTasks: filteredOperationalTasks,
        })
      : undefined;

  const unreadAssignments: UnreadAssignment[] = rawUnreadAssignments.map((n) => ({
    id: n._id.toString(),
    type: n.type as "TASK_ASSIGNED" | "PROJECT_ASSIGNED",
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl ?? "",
    createdAt: n.createdAt
      ? new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "",
  }));

  return {
    ...copy,
    filterLabel,
    unreadAssignments,
    cards: [
      { label: presentLabel, value: String(presentToday), detail: `Employees who marked attendance on ${filterLabel}.` },
      { label: leaveLabel, value: String(onLeaveToday), detail: `Approved leave records active for ${filterLabel}.` },
      { label: "Projects Pending", value: String(pendingProjects), detail: "Projects in planning or hold state." },
      { label: "Projects In Progress", value: String(inProgressProjects), detail: "Projects currently under execution." },
      { label: "Projects Completed", value: String(completedProjects), detail: "Projects already closed successfully." },
      { label: "DSR Missing", value: String(dsrTrend.at(-1)?.missing ?? 0), detail: `Employees missing DSR for ${filterLabel}.` },
    ],
    notificationTitle: "System Notifications",
    notifications,
    weeklySummaryTitle: "Weekly Summary",
    weeklySummaryCards: buildOverviewWeeklySummaryCards({
      attendanceRows: weekAttendance,
      dsrRows: weekUpdates,
      leaveRows: currentWindowLeaveRows,
      taskRows: currentWindowTaskRows,
      activePeopleCount: activeStaffUsers.length,
    }),
    calendarTitle: "Upcoming Calendar",
    calendarItems: buildOverviewCalendarItems({ leaves: leaveRows, tasks: taskRows, userMap: employeeMap }),
    performanceTitle: "Performance Score",
    performanceRows: (await buildOverviewPerformanceRows(employeeIds)).slice(0, 5),
    directoryTitle: "Employee Directory",
    directoryEmptyMessage: "No active employees available right now.",
    directoryItems: activeStaffUsers.map((employee) => ({
      id: employee._id.toString(),
      title: employee.fullName,
      meta: employee.joiningDate ? `Joined ${formatDate(employee.joiningDate)}` : "Joining date not added",
      description: [employee.email, employee.phone || "Phone not added"].join(" | "),
    })),
    primaryListTitle: filter ? `On Leave — ${filterLabel}` : "Today On Leave",
    primaryEmptyMessage: `No employees are on leave for ${filterLabel}.`,
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
    executiveSections,
  };
}

function buildExecutiveOverviewSections({
  activeEmployees,
  activeSalesUsers,
  absentToday,
  allPayments,
  filterLabel,
  isFiltered,
  leaveRows,
  onLeaveToday,
  operationalTasks,
  pitchOwners,
  presentToday,
  presentUserIds,
  projects,
  salesLeads,
  salesUserMap,
  today,
}: {
  activeEmployees: Array<{ _id: { toString(): string }; fullName: string; email: string; phone?: string; joiningDate?: Date | null }>;
  activeSalesUsers: Array<{ _id: { toString(): string }; fullName: string; email: string }>;
  absentToday: number;
  allPayments: Array<{ _id: { toString(): string }; salesUserId: string; clientName?: string; projectName?: string; invoiceNumber?: string; amount?: number; receivedAmount?: number; dueDate?: string; receivedDate?: string; status?: string; createdAt?: Date | null }>;
  filterLabel: string;
  isFiltered: boolean;
  leaveRows: Array<{ _id: { toString(): string }; userId: string; leaveType?: string; startDate: string; endDate: string; status?: string; reason?: string }>;
  onLeaveToday: number;
  operationalTasks: Array<{ _id: { toString(): string }; title: string; description?: string; dueDate: string; status?: string; assignedUserId: string; labels?: string[]; createdAt?: Date | null }>;
  pitchOwners: Array<{ id: string; name: string; email: string }>;
  presentToday: number;
  presentUserIds: Set<string>;
  projects: Array<{ _id: { toString(): string }; name: string; summary: string; status?: string; priority?: string; assignedUserIds?: string[]; dueDate?: Date | null; closedByEmployeeId?: string | null; closedByEmployeeAt?: Date | null; createdAt?: Date | null }>;
  salesLeads: Array<{
    _id: { toString(): string };
    salesUserId: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    technologies?: string[];
    meetingDate?: string;
    meetingTime?: string;
    budget?: number;
    pitchedPrice?: number;
    deliveryDate?: string;
    dateOfFirstCall?: string;
    dateOfLastCall?: string;
    nextFollowUpDate?: string;
    callbackReminderDate?: string;
    expectedCloseDate?: string;
    createdAt?: Date | null;
  }>;
  salesUserMap: Map<string, { _id: { toString(): string }; fullName: string; email: string }>;
  today: string;
}): ExecutiveOverviewSection[] {
  const totalProjects = projects.length;
  const closedProjects = projects.filter((project) => project.status === "COMPLETED").length;
  const ongoingProjects = projects.filter((project) => project.status === "IN_PROGRESS").length;
  const planningProjects = projects.filter((project) => project.status === "PLANNING" || project.status === "ON_HOLD").length;
  const closedByEmployeeProjects = projects.filter((project) => project.closedByEmployeeId).length;

  // Encode raw status + priority + closedByEmployee in meta for rich card rendering on frontend
  const projectItems: DashboardListItem[] = projects.slice(0, 8).map((project) => ({
    id: project._id.toString(),
    title: project.name,
    meta: [
      project.status ?? "PLANNING",
      project.priority ?? "MEDIUM",
      project.closedByEmployeeId ? "1" : "0",
      String(project.assignedUserIds?.length ?? 0),
      project.dueDate ? formatDate(project.dueDate) : "",
    ].join("||"),
    description: project.summary?.trim() || "No project description added.",
  }));

  // ── Real payment aggregations ──
  const paymentTotalCollected = allPayments.reduce((sum, p) => sum + Number(p.receivedAmount ?? 0), 0);
  const paymentTotalAmount = allPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const paymentTotalBalance = Math.max(paymentTotalAmount - paymentTotalCollected, 0);
  const overduePayments = allPayments.filter((p) => {
    const status = p.status ?? "PENDING";
    const isOverdue = status === "OVERDUE" || (status === "PENDING" && p.dueDate && p.dueDate < today);
    return isOverdue;
  });
  const paidPayments = allPayments.filter((p) => p.status === "PAID");
  const partialPayments = allPayments.filter((p) => p.status === "PARTIAL");
  const pendingPayments = allPayments.filter((p) => {
    const status = p.status ?? "PENDING";
    return status === "PENDING" && (!p.dueDate || p.dueDate >= today);
  });

  const paymentItems: DashboardListItem[] = allPayments.slice(0, 8).map((p) => {
    const amount = Number(p.amount ?? 0);
    const received = Number(p.receivedAmount ?? 0);
    const balance = Math.max(amount - received, 0);
    const status = p.status ?? "PENDING";
    const resolvedStatus = status === "PENDING" && p.dueDate && p.dueDate < today ? "OVERDUE" : status;
    return {
      id: p._id.toString(),
      title: p.clientName || p.invoiceNumber || "Unnamed client",
      meta: `${resolvedStatus}||${formatCurrency(amount)}||${formatCurrency(received)}||${formatCurrency(balance)}||${p.dueDate ?? ""}`,
      description: p.projectName ? `Project: ${p.projectName}` : "No project name",
    };
  });

  const employeeItems: DashboardListItem[] = [
    ...activeEmployees.slice(0, 6).map((employee) => {
      const employeeId = employee._id.toString();
      const isPresent = presentUserIds.has(employeeId);
      const isOnLeave = leaveRows.some((leave) => leave.userId === employeeId && leave.status === "APPROVED" && leave.startDate <= today && leave.endDate >= today);
      const todayStatus = isPresent ? "Present" : isOnLeave ? "On leave today" : "Not marked";

      return {
        id: employeeId,
        title: employee.fullName,
        meta: employee.joiningDate ? `Joined ${formatDate(employee.joiningDate)}` : isOnLeave ? "On Leave Today" : "Active Employee",
        description: [employee.email, employee.phone || "Phone not added", todayStatus].join(" | "),
      };
    }),
  ];

  const todaySalesMeetings = salesLeads.filter((lead) => lead.meetingDate === today).length;
  const totalQuotedValue = salesLeads.reduce((sum, lead) => sum + Number(lead.pitchedPrice ?? 0), 0);
  const totalBudgetValue = salesLeads.reduce((sum, lead) => sum + Number(lead.budget ?? 0), 0);
  const leadItems: DashboardListItem[] = salesLeads.slice(0, 6).map((lead) => {
    const salesOwner = salesUserMap.get(lead.salesUserId);
    const techLabel = (lead.technologies ?? []).slice(0, 3).join(", ");

    return {
      id: lead._id.toString(),
      title: lead.clientName,
      meta: `${salesOwner?.fullName ?? "Sales"} | ${lead.meetingDate || "Meeting pending"}`,
      description: [
        lead.clientEmail || lead.clientPhone || "Client contact not added",
        techLabel ? `Tech: ${techLabel}` : "Tech pending",
        `Budget ${formatCurrency(Number(lead.budget ?? 0))} | Pitch ${formatCurrency(Number(lead.pitchedPrice ?? 0))}`,
        lead.deliveryDate ? `Delivery ${lead.deliveryDate}` : "Delivery not fixed",
      ].join(" | "),
    };
  });

  const clientMeetings = salesLeads.filter((lead) => lead.meetingDate === today);
  const meetingTasks = operationalTasks.filter((task) => task.dueDate === today && /\bmeeting\b/i.test(`${task.title} ${task.description ?? ""}`));
  const todayMeetingUsers = new Set([...clientMeetings.map((lead) => lead.salesUserId), ...meetingTasks.map((task) => task.assignedUserId)]).size;
  const completedMeetings = meetingTasks.filter((task) => task.status === "COMPLETED").length;
  const totalMeetingsToday = clientMeetings.length + meetingTasks.length;
  const pendingMeetings = Math.max(totalMeetingsToday - completedMeetings, 0);
  const clientMeetingItems: DashboardListItem[] = clientMeetings.map((lead) => {
    const salesOwner = salesUserMap.get(lead.salesUserId);
    const techLabel = (lead.technologies ?? []).slice(0, 3).join(", ");

    return {
      id: `lead-${lead._id.toString()}`,
      title: lead.clientName,
      meta: ["Client Meeting", lead.meetingTime || "Time not set", salesOwner?.fullName ?? "Sales", "Scheduled"].join("||"),
      description: [
        lead.clientEmail || lead.clientPhone || "Client contact not added",
        techLabel || "Tech not added",
        formatCurrency(Number(lead.budget ?? 0)),
        formatCurrency(Number(lead.pitchedPrice ?? 0)),
        lead.deliveryDate || "Delivery not fixed",
      ].join("||"),
    };
  });
  const taskMeetingItems: DashboardListItem[] = meetingTasks.map((task) => ({
    id: `task-${task._id.toString()}`,
    title: task.title,
    meta: ["Internal Meeting", "Time not set", "Assigned Team", formatLabel(task.status ?? "PENDING")].join("||"),
    description: [task.description?.trim() || "No meeting note added", "Task", "N/A", "N/A", task.dueDate].join("||"),
  }));
  const meetingItems: DashboardListItem[] = [...clientMeetingItems, ...taskMeetingItems].slice(0, 10);

  return [
    {
      id: "projects",
      badge: "Portfolio",
      title: "Project Portfolio",
      description: isFiltered ? `Projects matching ${filterLabel} by created, due, or closed date.` : "Total projects, closed work, and current execution pipeline for the company.",
      metrics: [
        { label: "Total Projects", value: String(totalProjects), detail: isFiltered ? `Projects found for ${filterLabel}.` : "All projects currently tracked in the company workspace." },
        { label: "In Progress", value: String(ongoingProjects), detail: "Projects actively moving in execution." },
        { label: "Completed", value: String(closedProjects), detail: "Projects already marked as completed." },
        { label: "Planned / Hold", value: String(planningProjects), detail: "Projects waiting, planning, or on hold." },
        { label: "Closed by Employee", value: String(closedByEmployeeProjects), detail: "Projects self-reported as closed by assigned employees." },
      ],
      items: projectItems,
      emptyMessage: isFiltered ? `No projects found for ${filterLabel}.` : "No projects are available yet.",
    },
    {
      id: "payments",
      badge: "Finance",
      title: "Payment Pipeline",
      description: isFiltered ? `Payment records matching ${filterLabel} by due, received, or created date.` : "Collected, pending, and partially received payment visibility for leadership review.",
      note: overduePayments.length > 0
        ? `⚠️ ${overduePayments.length} payment${overduePayments.length !== 1 ? "s are" : " is"} overdue. Review immediately from the Payments page.`
        : allPayments.length === 0
          ? isFiltered
            ? `No payment records found for ${filterLabel}.`
            : "No payment records added yet. Go to the Payments page to add client payment records."
          : undefined,
      metrics: [
        { label: "Total Collected", value: formatCurrency(paymentTotalCollected), detail: `${paidPayments.length} fully paid + ${partialPayments.length} partial payments received.` },
        { label: "Balance Due", value: formatCurrency(paymentTotalBalance), detail: "Total outstanding amount across all active records." },
        { label: "Pending Records", value: String(pendingPayments.length), detail: "Payment records still awaiting receipt." },
        { label: "Overdue", value: String(overduePayments.length), detail: "Past due date and still not fully paid." },
      ],
      items: paymentItems,
      emptyMessage: isFiltered ? `No payment records found for ${filterLabel}.` : "No payment records added yet. Use the Payments page to track client invoices.",
    },
    {
      id: "workforce",
      badge: "People",
      title: "Employee Management",
      description: "Headcount, attendance, leave, and employee profile visibility for the active workforce.",
      metrics: [
        { label: "Total Employees", value: String(activeEmployees.length), detail: "Active employee accounts in the company." },
        { label: isFiltered ? "Present" : "Present Today", value: String(presentToday), detail: isFiltered ? `Employees with attendance in ${filterLabel}.` : "Employees who marked attendance today." },
        { label: "On Leave", value: String(onLeaveToday), detail: "Employees currently on approved leave." },
        { label: "Not Marked", value: String(absentToday), detail: isFiltered ? `Active employees without attendance or approved leave in ${filterLabel}.` : "Employees who have not marked attendance yet." },
      ],
      items: employeeItems,
      emptyMessage: "No active employee records are available yet.",
    },
    {
      id: "leads",
      badge: "Sales",
      title: "Client Pitch Tracker",
      description: isFiltered ? `Client pitch records matching ${filterLabel} by call, follow-up, meeting, delivery, or created date.` : "Track every client conversation for project pitches: what was discussed, budget, quoted price, follow-up date, meeting plan, and next action.",
      note:
        salesLeads.length > 0
          ? `Client pitch tracker entries are synced from the sales CRM register. Active sales team: ${activeSalesUsers.length}.`
          : activeSalesUsers.length > 0
            ? isFiltered
              ? `No client pitch records found for ${filterLabel}.`
              : "No client pitch entries yet. Add the client, discussion notes, budget, quote, follow-up, and meeting details from the sales pipeline form."
            : "No active sales users are available. Add a sales account first, then create client pitch records.",
      metrics: [
        { label: "Tracked Clients", value: String(salesLeads.length), detail: "Client records currently saved in the sales pipeline." },
        { label: "Meetings Today", value: String(todaySalesMeetings), detail: "Client meetings scheduled for today." },
        { label: "Client Budget", value: formatCurrency(totalBudgetValue), detail: "Total client budget captured across the tracker." },
        { label: "Quoted Value", value: formatCurrency(totalQuotedValue), detail: "Total pitched value already shared by the sales team." },
      ],
      meetingOwners: pitchOwners,
      items: leadItems,
      emptyMessage: isFiltered ? `No client pitch records found for ${filterLabel}.` : "No client pitch records are available right now.",
    },
    {
      id: "meetings",
      badge: "Schedule",
      title: isFiltered ? "Meetings" : "Today's Meetings",
      description: isFiltered ? `Client meetings and internal meeting tasks scheduled for ${filterLabel}.` : "Today's client meetings and internal meeting tasks in one schedule view.",
      metrics: [
        { label: isFiltered ? "Meetings" : "Meetings Today", value: String(totalMeetingsToday), detail: isFiltered ? `Client and internal meetings scheduled for ${filterLabel}.` : "Client and internal meetings scheduled for today." },
        { label: "Client Meetings", value: String(clientMeetings.length), detail: isFiltered ? `Sales pipeline client meetings scheduled for ${filterLabel}.` : "Sales pipeline client meetings scheduled for today." },
        { label: "People In Meetings", value: String(todayMeetingUsers), detail: isFiltered ? `Unique team members linked to meetings in ${filterLabel}.` : "Unique team members linked to today's meetings." },
        { label: "Completed", value: String(completedMeetings), detail: "Meeting tasks marked complete." },
        { label: "Pending", value: String(pendingMeetings), detail: "Meeting tasks still not closed." },
      ],
      meetingOwners: activeSalesUsers.map((user) => ({
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
      })),
      items: meetingItems,
      emptyMessage: isFiltered ? `No client or internal meetings are scheduled for ${filterLabel}.` : "No client or internal meetings are scheduled for today.",
    },
  ];
}

function isProjectInFilterWindow(
  project: { dueDate?: Date | null; closedByEmployeeAt?: Date | null; createdAt?: Date | null },
  start: string,
  end: string,
) {
  return [
    project.createdAt ? formatDate(project.createdAt) : "",
    project.dueDate ? formatDate(project.dueDate) : "",
    project.closedByEmployeeAt ? formatDate(project.closedByEmployeeAt) : "",
  ].some((dateKey) => isDateInRange(dateKey, start, end));
}

function isSalesLeadInFilterWindow(
  lead: {
    callbackReminderDate?: string;
    createdAt?: Date | null;
    dateOfFirstCall?: string;
    dateOfLastCall?: string;
    deliveryDate?: string;
    expectedCloseDate?: string;
    meetingDate?: string;
    nextFollowUpDate?: string;
  },
  start: string,
  end: string,
) {
  return [
    lead.meetingDate,
    lead.dateOfFirstCall,
    lead.dateOfLastCall,
    lead.nextFollowUpDate,
    lead.callbackReminderDate,
    lead.expectedCloseDate,
    lead.deliveryDate,
    lead.createdAt ? formatDate(lead.createdAt) : "",
  ].some((dateKey) => isDateInRange(dateKey, start, end));
}

function isPaymentInFilterWindow(
  payment: { createdAt?: Date | null; dueDate?: string; receivedDate?: string },
  start: string,
  end: string,
) {
  return [
    payment.dueDate,
    payment.receivedDate,
    payment.createdAt ? formatDate(payment.createdAt) : "",
  ].some((dateKey) => isDateInRange(dateKey, start, end));
}

function isDateLikeInRange(date: Date | null | undefined, start: string, end: string) {
  return date ? isDateInRange(formatDate(date), start, end) : false;
}

function isDateInRange(dateKey: string | null | undefined, start: string, end: string) {
  return Boolean(dateKey && dateKey >= start && dateKey <= end);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function resolveDateFilter(
  filter: DashboardDateFilter,
  realToday: string,
): { anchor: string; rangeStart: string; filterLabel: string; presentLabel: string; leaveLabel: string } {
  if (!filter) {
    return {
      anchor: realToday,
      rangeStart: addDaysToDate(realToday, -6),
      filterLabel: "Today",
      presentLabel: "Present Today",
      leaveLabel: "On Leave Today",
    };
  }

  if (filter.type === "date") {
    const label = formatFilterDateLabel(filter.value);
    return {
      anchor: filter.value,
      rangeStart: addDaysToDate(filter.value, -6),
      filterLabel: label,
      presentLabel: `Present — ${label}`,
      leaveLabel: `On Leave — ${label}`,
    };
  }

  // month filter: YYYY-MM
  const [year, month] = filter.value.split("-").map(Number);
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = `${filter.value}-${String(lastDayNum).padStart(2, "0")}`;
  const anchor = lastDay <= realToday ? lastDay : realToday;
  const label = formatFilterMonthLabel(filter.value);
  return {
    anchor,
    rangeStart: `${filter.value}-01`,
    filterLabel: label,
    presentLabel: `Present in ${label}`,
    leaveLabel: `On Leave in ${label}`,
  };
}

function formatFilterDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatFilterMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}



