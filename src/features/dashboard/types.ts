export type SummaryCard = {
  label: string;
  value: string;
  detail: string;
};

export type DashboardListItem = {
  id: string;
  title: string;
  meta: string;
  description: string;
};

export type DashboardNotificationItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  actionUrl: string;
};

export type CalendarEventItem = {
  id: string;
  title: string;
  date: string;
  type: string;
  detail: string;
};

export type PerformanceScoreRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  score: number;
  attendanceRate: number;
  taskCompletionRate: number;
  dsrConsistencyRate: number;
};

export type DashboardBreakdownSlice = {
  label: string;
  value: number;
  color: string;
};

export type AttendanceTrendPoint = {
  label: string;
  present: number;
  onLeave: number;
  absent: number;
};

export type LeaveTrendPoint = {
  label: string;
  count: number;
};

export type DsrTrendPoint = {
  label: string;
  submitted: number;
  missing: number;
};

export type EmployeeProjectSummaryRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  pendingProjects: number;
  completedProjects: number;
};

export type ExecutiveOverviewSection = {
  id: string;
  badge: string;
  title: string;
  description: string;
  note?: string;
  meetingOwners?: Array<{ id: string; name: string; email: string }>;
  metrics: SummaryCard[];
  items: DashboardListItem[];
  emptyMessage: string;
};

export type UnreadAssignment = {
  id: string;
  type: "TASK_ASSIGNED" | "PROJECT_ASSIGNED";
  title: string;
  message: string;
  actionUrl: string;
  createdAt: string;
};

export type DashboardOverviewData = {
  title: string;
  description: string;
  cards: SummaryCard[];
  unreadAssignments?: UnreadAssignment[];
  priorityAlert?: {
    title: string;
    detail: string;
    actionLabel: string;
    actionUrl: string;
  };
  notificationTitle?: string;
  notifications?: DashboardNotificationItem[];
  weeklySummaryTitle?: string;
  weeklySummaryCards?: SummaryCard[];
  calendarTitle?: string;
  calendarItems?: CalendarEventItem[];
  performanceTitle?: string;
  performanceRows?: PerformanceScoreRow[];
  directoryEmptyMessage?: string;
  directoryItems?: DashboardListItem[];
  directoryTitle?: string;
  primaryListTitle: string;
  primaryEmptyMessage: string;
  primaryItems: DashboardListItem[];
  secondaryListTitle: string;
  secondaryEmptyMessage: string;
  secondaryItems: DashboardListItem[];
  attendanceBreakdown?: DashboardBreakdownSlice[];
  attendanceTrend?: AttendanceTrendPoint[];
  taskStatusBreakdown?: DashboardBreakdownSlice[];
  projectStatusBreakdown?: DashboardBreakdownSlice[];
  leaveTrend?: LeaveTrendPoint[];
  dsrTrend?: DsrTrendPoint[];
  employeeProjectRows?: EmployeeProjectSummaryRow[];
  executiveSections?: ExecutiveOverviewSection[];
  financeNote?: string;
};

export type EmployeeDirectoryEntry = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joiningDate: string;
  managerId: string;
  managerName: string;
  techStack: string[];
  todayStatus: string;
  role: "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE" | "SALES";
  status: "ACTIVE" | "SUSPENDED";
  projectIds: string[];
  documentName: string;
  documentUrl: string;
  employeeId: string;
  department: string;
  designation: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  bankAccountNumber: string;
  bankName: string;
  bankIfscCode: string;
  panNumber: string;
  profilePhotoUrl: string;
};

export type EmployeeProjectEntry = {
  id: string;
  name: string;
  summary: string;
  status: string;
  priority: string;
  dueDate: string;
  techStack: string[];
  assignedUserIds: string[];
  assignedUserNames: string[];
  createdByUserId: string;
  closedByEmployeeId: string;
  closedByEmployeeAt: string;
  clientName: string;
  clientBudget: number;
};

export type SalesLeadEntry = {
  id: string;
  salesUserId: string;
  salesUserName: string;
  salesUserEmail: string;
  companyName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  source: string;
  status: string;
  priority: string;
  technologies: string[];
  meetingLink: string;
  meetingDate: string;
  meetingTime: string;
  nextFollowUpDate: string;
  expectedCloseDate: string;
  budget: number;
  pitchedPrice: number;
  deliveryDate: string;
  notes: string;
  createdAt: string;
};

export type SalesCustomerEntry = {
  id: string;
  salesUserId: string;
  salesUserName: string;
  companyName: string;
  clientName: string;
  clientEmail: string;
  status: string;
  lastContactDate: string;
  totalBilledAmount: number;
  outstandingAmount: number;
};

export type SalesFollowUpEntry = {
  id: string;
  salesUserId: string;
  salesUserName: string;
  clientName: string;
  leadId: string;
  followUpDate: string;
  followUpTime: string;
  channel: string;
  status: string;
  outcome: string;
  nextFollowUpDate: string;
};

export type SalesDealEntry = {
  id: string;
  salesUserId: string;
  salesUserName: string;
  title: string;
  leadId: string;
  customerId: string;
  stage: string;
  status: string;
  amount: number;
  probability: number;
  expectedCloseDate: string;
};

export type SalesPaymentEntry = {
  id: string;
  salesUserId: string;
  salesUserName: string;
  invoiceNumber: string;
  customerId: string;
  dealId: string;
  amount: number;
  receivedAmount: number;
  dueDate: string;
  receivedDate: string;
  status: string;
};

export type SalesTargetEntry = {
  id: string;
  salesUserId: string;
  salesUserName: string;
  monthKey: string;
  targetAmount: number;
  achievedAmount: number;
  incentiveAmount: number;
  status: string;
  achievementRate: number;
};

export type SalesWorkspaceData = {
  summaryCards: SummaryCard[];
  customers: SalesCustomerEntry[];
  followUps: SalesFollowUpEntry[];
  deals: SalesDealEntry[];
  payments: SalesPaymentEntry[];
  targets: SalesTargetEntry[];
};

export type FileAttachmentView = {
  name: string;
  url: string;
};

export type DsrFeedEntry = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  projectName: string;
  workDate: string;
  summary: string;
  accomplishments: string;
  blockers: string;
  nextPlan: string;
  attachments: FileAttachmentView[];
};

export type EmployeesPageData = {
  managerOptions: EmployeeOption[];
  salesOptions: EmployeeOption[];
  salesTechnologyOptions: string[];
  salesLeadSourceOptions: string[];
  salesLeadStatusOptions: string[];
  salesLeadPriorityOptions: string[];
  summaryCards: SummaryCard[];
  users: EmployeeDirectoryEntry[];
  projects: EmployeeProjectEntry[];
  salesLeadRows: SalesLeadEntry[];
  salesWorkspace: SalesWorkspaceData;
  recentUpdates: DsrFeedEntry[];
};

export type AttendanceRecordView = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  dateKey: string;
  checkInAt: string;
  checkOutAt: string;
  status: string;
  workMode: string;
  isHalfDay: boolean;
  isLate: boolean;
  lateByMinutes: number;
  overtimeMinutes: number;
  workedMinutes: number;
  checkInLocation?: { lat: number; lng: number; accuracy: number | null } | null;
};

export type AttendanceMonthlyRow = {
  id: string;
  employeeName: string;
  daysMarked: number;
  completedDays: number;
};

export type AttendancePageData = {
  canMarkAttendance: boolean;
  canViewLocation: boolean;
  summaryCards: SummaryCard[];
  todayRecord: AttendanceRecordView | null;
  todayRecords: AttendanceRecordView[];
  monthlyRows: AttendanceMonthlyRow[];
};

export type LeaveEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string;
  status: string;
  updatedAt: string;
};

export type LeaveEmployeeSummary = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  approvedDays: number;
  requestedDays: number;
};

export type LeavePageData = {
  summaryCards: SummaryCard[];
  leaves: LeaveEntry[];
  employeeSummaries: LeaveEmployeeSummary[];
};

export type TaskCommentView = {
  id: string;
  userName: string;
  role: string;
  message: string;
  createdAt: string;
};

export type TaskEntry = {
  id: string;
  title: string;
  description: string;
  assignedUserId: string;
  assignedUserName: string;
  assignedByName: string;
  dueDate: string;
  status: string;
  priority: string;
  labels: string[];
  isOverdue: boolean;
  attachments: FileAttachmentView[];
  comments: TaskCommentView[];
};

export type EmployeeOption = {
  id: string;
  label: string;
  role?: string; // EMPLOYEE | MANAGER | SUPER_ADMIN — used to show role badge in dropdowns
};

export type TaskPageData = {
  summaryCards: SummaryCard[];
  tasks: TaskEntry[];
  assignedProjects: EmployeeProjectView[];
  employeeOptions: EmployeeOption[];
  labelOptions: string[];
};

export type EmployeeProjectView = {
  id: string;
  name: string;
  summary: string;
  status: string;
  priority: string;
  dueDate: string;
  techStack: string[];
};

export type ProjectsPageData = {
  summaryCards: SummaryCard[];
  projects: EmployeeProjectEntry[];
  employeeOptions: EmployeeOption[];
  technologyOptions: string[];
};

export type EmployeeUpdateView = {
  id: string;
  workDate: string;
  summary: string;
  accomplishments: string;
  blockers: string;
  nextPlan: string;
  projectId: string;
  projectName: string;
  attachments: FileAttachmentView[];
};

export type DsrMissingEntry = {
  id: string;
  employeeName: string;
  employeeEmail: string;
};

export type DsrPageData =
  | {
      mode: "employee";
      summaryCards: SummaryCard[];
      projects: EmployeeProjectView[];
      updates: EmployeeUpdateView[];
      reminderMessage: string;
    }
  | {
      mode: "review";
      summaryCards: SummaryCard[];
      updates: DsrFeedEntry[];
      missingEmployees: DsrMissingEntry[];
      reminderMessage: string;
    };

export type ReportsPageData = {
  summaryCards: SummaryCard[];
  weeklySummaryCards: SummaryCard[];
  calendarItems: CalendarEventItem[];
  performanceRows: PerformanceScoreRow[];
  attendanceRows: AttendanceMonthlyRow[];
  leaveRows: LeaveEntry[];
  taskRows: TaskEntry[];
  monthLabel: string;
  monthlyEmployeeRows: EmployeeMonthlyReportRow[];
  monthlyEmployeeReports: EmployeeMonthlyDetailReport[];
};

export type EmployeeMonthlyReportRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  attendanceDays: number;
  completedAttendanceDays: number;
  leaveDays: number;
  leaveRequests: number;
  taskCount: number;
  completedTaskCount: number;
  taskTitles: string[];
};

export type EmployeeMonthlyDailyStatus = {
  date: string;
  attendanceStatus: string;
  checkInAt: string;
  checkOutAt: string;
  projectNames: string[];
  dsrSummary: string;
};

export type EmployeeMonthlyDsrReportRow = {
  id: string;
  workDate: string;
  projectName: string;
  summary: string;
  accomplishments: string;
  blockers: string;
  nextPlan: string;
};

export type EmployeeMonthlyTaskReportRow = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
};

export type EmployeeMonthlyDetailReport = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  attendanceDays: number;
  completedAttendanceDays: number;
  leaveDays: number;
  leaveRequests: number;
  taskCount: number;
  completedTaskCount: number;
  dailyRows: EmployeeMonthlyDailyStatus[];
  dsrRows: EmployeeMonthlyDsrReportRow[];
  taskRows: EmployeeMonthlyTaskReportRow[];
};

export type SettingsPageData = {
  canManageCompany: boolean;
  companyName: string;
  currentUserEmail: string;
  currentUserName: string;
  currentUserRoleLabel: string;
  workStart: string;
  workEnd: string;
  leavePolicy: string;
  workingDays: number;
  salaryDay: number;
  lateGraceMinutes: number;
  holidays: HolidayEntry[];
  officeLatitude: number | null;
  officeLongitude: number | null;
  geoFenceRadiusMeters: number;
  geoFenceEnabled: boolean;
};

// ─── Salary & Payroll ───────────────────────────────────────────────────────

export type SalaryStructureEntry = {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  basicSalary: number;
  hra: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  tds: number;
  providentFund: number;
  otherDeductions: number;
  netSalary: number;
  effectiveFrom: string;
  status: string;
  note: string;
};

export type PayslipEntry = {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  monthKey: string;
  basicSalary: number;
  hra: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  tds: number;
  providentFund: number;
  leaveDays: number;
  leaveDeduction: number;
  lateDays: number;
  lateDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  presentDays: number;
  workingDays: number;
  status: string;
  paidOn: string;
  note: string;
};

export type PayrollPageData = {
  summaryCards: SummaryCard[];
  salaryStructures: SalaryStructureEntry[];
  payslips: PayslipEntry[];
  employeeOptions: EmployeeOption[];
  selectedMonthKey: string;
  availableMonthKeys: string[];
};

// ─── Leave Balance ──────────────────────────────────────────────────────────

export type LeaveBalanceEntry = {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  year: number;
  paidLeaveTotal: number;
  paidLeaveUsed: number;
  paidLeaveRemaining: number;
  sickLeaveTotal: number;
  sickLeaveUsed: number;
  sickLeaveRemaining: number;
  casualLeaveTotal: number;
  casualLeaveUsed: number;
  casualLeaveRemaining: number;
  compOffEarned: number;
  compOffUsed: number;
  compOffRemaining: number;
};

// ─── Expenses ───────────────────────────────────────────────────────────────

export type ExpenseEntry = {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  receiptUrl: string;
  receiptName: string;
  status: string;
  reviewNote: string;
  paidOn: string;
  createdAt: string;
};

export type ExpensePageData = {
  summaryCards: SummaryCard[];
  expenses: ExpenseEntry[];
  canReview: boolean;
};

// ─── Announcements ──────────────────────────────────────────────────────────

export type AnnouncementEntry = {
  id: string;
  title: string;
  body: string;
  type: string;
  isPinned: boolean;
  expiresAt: string;
  createdByName: string;
  createdAt: string;
};

export type AnnouncementsPageData = {
  announcements: AnnouncementEntry[];
  canManage: boolean;
};

// ─── Holidays ───────────────────────────────────────────────────────────────

export type HolidayEntry = {
  id: string;
  name: string;
  date: string;
  year: number;
  type: string;
  description: string;
};

// ─── Employee Detail Page ────────────────────────────────────────────────────

export type EmployeeDetailDsrEntry = {
  id: string;
  workDate: string;
  summary: string;
  accomplishments: string;
  blockers: string;
  nextPlan: string;
};

export type EmployeeDetailPaymentEntry = {
  id: string;
  clientName: string;
  invoiceNumber: string;
  totalAmount: number;
  receivedAmount: number;
  balanceDue: number;
  dueDate: string;
  status: string;
};

export type EmployeeDetailProjectEntry = {
  id: string;
  name: string;
  summary: string;
  status: string;
  priority: string;
  dueDate: string;
  techStack: string[];
  assignedUserNames: string[];
  createdByUserId: string;
  dsrEntries: EmployeeDetailDsrEntry[];
  payments: EmployeeDetailPaymentEntry[];
};

export type EmployeeDetailAttendance = {
  monthLabel: string;
  daysPresent: number;
  daysCompleted: number;
  daysOnLeave: number;
  lateCount: number;
  totalWorkingDays: number;
};

export type EmployeeDetailLeaveEntry = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string;
  status: string;
};

export type EmployeeDetailPayslip = {
  id: string;
  monthKey: string;
  netSalary: number;
  grossSalary: number;
  totalDeductions: number;
  presentDays: number;
  workingDays: number;
  status: string;
  paidOn: string;
};

export type EmployeeDetailSalary = {
  basicSalary: number;
  hra: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  tds: number;
  providentFund: number;
  otherDeductions: number;
  netSalary: number;
  effectiveFrom: string;
  status: string;
};

export type EmployeeDetailData = {
  employee: EmployeeDirectoryEntry;
  salary: EmployeeDetailSalary | null;
  projects: EmployeeDetailProjectEntry[];
  currentMonthAttendance: EmployeeDetailAttendance;
  leaveHistory: EmployeeDetailLeaveEntry[];
  leaveBalance: {
    paidLeaveTotal: number;
    paidLeaveUsed: number;
    paidLeaveRemaining: number;
    sickLeaveTotal: number;
    sickLeaveUsed: number;
    sickLeaveRemaining: number;
    casualLeaveTotal: number;
    casualLeaveUsed: number;
    casualLeaveRemaining: number;
  } | null;
  recentPayslips: EmployeeDetailPayslip[];
  canViewSensitive: boolean;
};

// ─── Project Detail Page ─────────────────────────────────────────────────────

export type ProjectDetailDsrEntry = {
  id: string;
  workDate: string;
  summary: string;
  accomplishments: string;
  blockers: string;
  nextPlan: string;
};

export type ProjectDetailEmployeeEntry = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  designation: string;
  department: string;
  employeeId: string;
  todayStatus: string;
  dsrEntries: ProjectDetailDsrEntry[];
};

export type ProjectDetailPaymentEntry = {
  id: string;
  clientName: string;
  invoiceNumber: string;
  totalAmount: number;
  receivedAmount: number;
  balanceDue: number;
  dueDate: string;
  receivedDate: string;
  status: string;
  note: string;
  createdByName: string;
};

export type ProjectDetailData = {
  id: string;
  name: string;
  summary: string;
  status: string;
  priority: string;
  dueDate: string;
  techStack: string[];
  createdByUserId: string;
  createdByName: string;
  closedByEmployeeId: string;
  closedByEmployeeAt: string;
  clientName: string;
  clientBudget: number;
  assignedEmployees: ProjectDetailEmployeeEntry[];
  payments: ProjectDetailPaymentEntry[];
  totalPayment: number;
  totalReceived: number;
  totalBalance: number;
  dsrTotalCount: number;
};

// ─── Employee Documents ─────────────────────────────────────────────────────

export type EmployeeDocumentEntry = {
  id: string;
  userId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  note: string;
  expiryDate: string;
  uploadedAt: string;
};

// ─── Audit Log ──────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetName: string;
  detail: string;
  createdAt: string;
};

export type AuditLogPageData = {
  logs: AuditLogEntry[];
  summaryCards: SummaryCard[];
};

// ─── Client Payments ────────────────────────────────────────────────────────

export type ClientPaymentEntry = {
  id: string;
  clientName: string;
  projectName: string;
  invoiceNumber: string;
  totalAmount: number;
  receivedAmount: number;
  balanceDue: number;
  dueDate: string;
  receivedDate: string;
  status: string; // PENDING | PARTIAL | PAID | OVERDUE
  note: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
};

export type PaymentsPageData = {
  payments: ClientPaymentEntry[];
  canManage: boolean;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  totalBalance: number;
  overdueCount: number;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
};
