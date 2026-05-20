import "server-only";
import connectDb from "@/database/mongodb/connect";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import type { UserRole } from "@/features/auth/lib/rbac";
import { UserModel, type UserStatus } from "@/database/mongodb/models/user";
import {
  ProjectModel,
  type ProjectPriority,
  type ProjectStatus,
} from "@/database/mongodb/models/project";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";

export async function isPublicRegistrationOpen() {
  await connectDb();
  const userCount = await UserModel.countDocuments();
  return userCount === 0;
}

export async function listUsersForAdmin() {
  await connectDb();
  const users = await UserModel.find(
    {},
    {
      fullName: 1,
      email: 1,
      phone: 1,
      joiningDate: 1,
      documentName: 1,
      documentUrl: 1,
      role: 1,
      status: 1,
      createdAt: 1,
      projectIds: 1,
    },
  )
    .sort({ createdAt: -1 })
    .lean();

  return users.map((user) => ({
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? "",
    joiningDate: user.joiningDate ?? null,
    documentName: user.documentName ?? "",
    documentUrl: user.documentUrl ?? "",
    role: user.role as UserRole,
    status: (user.status as UserStatus | undefined) ?? "ACTIVE",
    projectIds: user.projectIds ?? [],
    createdAt: user.createdAt,
  }));
}

export async function listProjectsForAdmin() {
  await connectDb();
  const projects = await ProjectModel.find(
    {},
    { name: 1, summary: 1, status: 1, priority: 1, dueDate: 1, assignedUserIds: 1, createdAt: 1 },
  )
    .sort({ createdAt: -1 })
    .lean();

  return projects.map((project) => ({
    id: project._id.toString(),
    name: project.name,
    summary: project.summary,
    status: project.status as ProjectStatus,
    priority: project.priority as ProjectPriority,
    dueDate: project.dueDate ?? null,
    assignedUserIds: project.assignedUserIds ?? [],
    createdAt: project.createdAt,
  }));
}

export async function listDailyUpdatesForAdmin() {
  await connectDb();

  const [updates, users, projects] = await Promise.all([
    DailyUpdateModel.find(
      {},
      { userId: 1, projectId: 1, workDate: 1, summary: 1, accomplishments: 1, blockers: 1, nextPlan: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    UserModel.find({}, { fullName: 1, email: 1 }).lean(),
    ProjectModel.find({}, { name: 1 }).lean(),
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), { fullName: user.fullName, email: user.email }]));
  const projectMap = new Map(projects.map((project) => [project._id.toString(), project.name]));

  return updates.map((update) => {
    const user = userMap.get(update.userId);

    return {
      id: update._id.toString(),
      userId: update.userId,
      employeeName: user?.fullName ?? "Unknown User",
      employeeEmail: user?.email ?? "",
      projectId: update.projectId ?? "",
      projectName: update.projectId ? projectMap.get(update.projectId) ?? "General" : "General",
      workDate: update.workDate,
      summary: update.summary,
      accomplishments: update.accomplishments,
      blockers: update.blockers ?? "",
      nextPlan: update.nextPlan ?? "",
      createdAt: update.createdAt,
    };
  });
}

export function assertSuperAdmin(session: AuthenticatedSession | null): asserts session is AuthenticatedSession {
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("SUPER_ADMIN access required.");
  }
}

export function assertAdminOrManager(session: AuthenticatedSession | null): asserts session is AuthenticatedSession {
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    throw new Error("Admin access required.");
  }
}


