import "server-only";
import connectDb from "@/database/mongodb/connect";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { UserModel } from "@/database/mongodb/models/user";
import { ProjectModel } from "@/database/mongodb/models/project";
import { TaskModel } from "@/database/mongodb/models/task";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { LeaveRequestModel } from "@/database/mongodb/models/leave-request";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { formatIndiaDateKey } from "@/shared/lib/india-time";
import { taskDeadline } from "@/features/tasks/deadline";

export async function getCurrentWork(session: AuthenticatedSession) {
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) throw new Error("Leadership access required.");
  await connectDb();
  const today = formatIndiaDateKey(new Date());
  const [employees, projects, tasks, attendance, leaves, updates] = await Promise.all([
    UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { fullName: 1 }).sort({ fullName: 1 }).lean(),
    ProjectModel.find({}, { name: 1, summary: 1, status: 1, assignedUserIds: 1, dueDate: 1 }).sort({ dueDate: 1 }).lean(),
    TaskModel.find({ status: { $in: ["PENDING", "IN_PROGRESS", "REJECTED"] } }, { title: 1, description: 1, assignedUserId: 1, status: 1, priority: 1, dueDate: 1, deadlineAt: 1 }).sort({ dueDate: 1 }).lean(),
    AttendanceModel.find({ dateKey: today }, { userId: 1, checkInAt: 1, checkOutAt: 1 }).lean(),
    LeaveRequestModel.find({ status: "APPROVED", startDate: { $lte: today }, endDate: { $gte: today } }, { userId: 1 }).lean(),
    DailyUpdateModel.find({ workDate: today }, { userId: 1, projectId: 1, summary: 1 }).sort({ updatedAt: -1 }).lean(),
  ]);
  const projectMap = new Map(projects.map((project) => [String(project._id), project.name]));
  const mappedTasks = tasks.map((task) => ({
    id: String(task._id), title: task.title, description: task.description, status: task.status,
    priority: task.priority, employeeId: task.assignedUserId, deadlineAt: taskDeadline(task)?.toISOString() ?? "",
  }));
  const people = employees.map((employee) => {
    const id = String(employee._id);
    const day = attendance.find((entry) => entry.userId === id);
    return {
      id, name: employee.fullName,
      presence: day?.checkOutAt ? "Checked out" : day?.checkInAt ? "Checked in" : leaves.some((leave) => leave.userId === id) ? "On leave" : "Not checked in",
      projects: projects.filter((project) => project.assignedUserIds.includes(id) && project.status !== "COMPLETED").map((project) => ({ id: String(project._id), name: project.name, status: project.status })),
      tasks: mappedTasks.filter((task) => task.employeeId === id),
      updates: updates.filter((update) => update.userId === id).map((update) => ({ id: String(update._id), project: projectMap.get(update.projectId) ?? "No linked project", summary: update.summary })),
    };
  });
  const now = new Date();
  const overdueTasks = mappedTasks.filter((task) => task.deadlineAt && new Date(task.deadlineAt) < now);
  const missingDsrPeople = people.filter((person) => person.presence === "Checked in" && person.updates.length === 0);
  const uncheckedPeople = people.filter((person) => person.presence === "Not checked in");
  const unassignedProjects = projects.filter((project) => project.status === "IN_PROGRESS" && project.assignedUserIds.length === 0);
  return {
    generatedAt: new Date().toISOString(),
    today, people,
    projects: projects.filter((project) => project.status === "IN_PROGRESS").map((project) => ({
      id: String(project._id), name: project.name, summary: project.summary,
      dueDate: project.dueDate ? formatIndiaDateKey(new Date(project.dueDate)) : "",
      people: people.filter((person) => project.assignedUserIds.includes(person.id)).map((person) => ({ id: person.id, name: person.name })),
    })),
    assignedTasks: mappedTasks.filter((task) => task.employeeId === session.user.id),
    insights: {
      checkedIn: people.filter((person) => person.presence === "Checked in").length,
      onLeave: people.filter((person) => person.presence === "On leave").length,
      unchecked: uncheckedPeople.length,
      overdueTasks,
      missingDsrPeople: missingDsrPeople.map((person) => ({ id: person.id, name: person.name })),
      unassignedProjects: unassignedProjects.map((project) => ({ id: String(project._id), name: project.name })),
    },
  };
}

export type CurrentWork = Awaited<ReturnType<typeof getCurrentWork>>;
