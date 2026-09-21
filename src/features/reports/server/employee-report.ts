import "server-only";

import connectDb from "@/database/mongodb/connect";
import { UserModel } from "@/database/mongodb/models/user";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { LeaveRequestModel } from "@/database/mongodb/models/leave-request";
import { TaskModel } from "@/database/mongodb/models/task";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { ProjectModel } from "@/database/mongodb/models/project";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { formatIndiaDateKey, formatIndiaDateTime, formatIndiaTimeKey } from "@/shared/lib/india-time";
import { taskDeadline, missedTaskDeadline, isTaskFinished } from "@/features/tasks/deadline";
import { dsrDayStatus, monthRange, type EmployeeExportData } from "../report-model";

export async function getEmployeeExport(session: AuthenticatedSession, employeeId: string, month: string): Promise<EmployeeExportData | null> {
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") throw new Error("Forbidden");
  if (!/^[a-f\d]{24}$/i.test(employeeId)) return null;
  const now = new Date();
  const today = formatIndiaDateKey(now);
  const range = monthRange(month, today);
  if (!range) return null;
  await connectDb();
  const employee = await UserModel.findOne({ _id: employeeId, role: "EMPLOYEE" }, { fullName: 1, email: 1 }).lean();
  if (!employee) return null;
  const startInstant = new Date(`${range.start}T00:00:00+05:30`);
  const endInstant = new Date(`${range.end}T23:59:59.999+05:30`);
  const [attendance, leaves, tasks, dsrs] = await Promise.all([
    AttendanceModel.find({ userId: employeeId, dateKey: { $gte: range.start, $lte: range.end } }).sort({ dateKey: 1 }).lean(),
    LeaveRequestModel.find({ userId: employeeId, status: "APPROVED", startDate: { $lte: range.end }, endDate: { $gte: range.start } }).lean(),
    TaskModel.find({ assignedUserId: employeeId, $or: [
      { dueDate: { $gte: range.start, $lte: range.end } },
      { completedAt: { $gte: startInstant, $lte: endInstant } },
    ] }).sort({ dueDate: 1 }).lean(),
    DailyUpdateModel.find({ userId: employeeId, workDate: { $gte: range.start, $lte: range.end } }).sort({ workDate: 1, createdAt: 1 }).lean(),
  ]);
  const projectIds = [...new Set(dsrs.map((row) => row.projectId).filter((id) => /^[a-f\d]{24}$/i.test(id)))];
  const projects = await ProjectModel.find({ _id: { $in: projectIds } }, { name: 1 }).lean();
  const projectNames = new Map(projects.map((project) => [project._id.toString(), project.name]));
  const byDate = new Map(attendance.map((row) => [row.dateKey, row]));
  const submittedDates = new Set(dsrs.map((row) => row.workDate));
  const stamp = (date?: Date | null) => date ? `${formatIndiaDateTime(date)} IST` : "";

  return {
    employee: { id: employeeId, name: employee.fullName, email: employee.email }, month, generatedAt: stamp(now),
    attendance: range.dates.map((date) => {
      const row = byDate.get(date);
      const onLeave = leaves.some((leave) => leave.startDate <= date && leave.endDate >= date);
      return {
        date, status: row ? (row.isHalfDay ? "Half day" : "Present") : onLeave ? "On leave" : "Not marked",
        checkIn: stamp(row?.checkInAt), checkOut: stamp(row?.checkOutAt), workMode: row?.workMode ?? "",
        isLate: Boolean(row?.isLate), lateMinutes: row?.isLate ? Number(row.lateByMinutes ?? 0) : 0,
        workedMinutes: Number(row?.workedMinutes ?? 0),
        dsrStatus: dsrDayStatus({ date, today, time: formatIndiaTimeKey(now), attended: Boolean(row), submitted: submittedDates.has(date) }),
      };
    }),
    tasks: tasks.map((task) => ({
      title: task.title, description: task.description, status: task.status, priority: task.priority,
      deadline: stamp(taskDeadline(task)), completedAt: stamp(task.completedAt),
      completedThisMonth: Boolean(isTaskFinished(task.status) && task.completedAt && task.completedAt >= startInstant && task.completedAt <= endInstant),
      deadlineMissed: missedTaskDeadline(task, now),
    })),
    dsrs: dsrs.map((row) => ({ date: row.workDate, project: projectNames.get(row.projectId) ?? "General / unavailable project", submittedAt: stamp(row.createdAt), summary: row.summary, accomplishments: row.accomplishments, blockers: row.blockers ?? "", nextPlan: row.nextPlan ?? "" })),
  };
}
