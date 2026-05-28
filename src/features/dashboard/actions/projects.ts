"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertAdminOrManager } from "@/features/auth/lib/user-admin";
import connectDb from "@/database/mongodb/connect";
import { createNotificationsForUsers } from "@/features/notifications/service";
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  ProjectModel,
  type ProjectPriority,
  type ProjectStatus,
} from "@/database/mongodb/models/project";
import { UserModel } from "@/database/mongodb/models/user";

type ProjectManagementState = {
  error?: string;
  success?: string;
  values?: {
    assignedUserIds?: string[];
    id?: string;
    name?: string;
    summary?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    dueDate?: string;
    techStack?: string[];
  };
};

export async function createManagedProject(
  _previousState: ProjectManagementState,
  formData: FormData,
): Promise<ProjectManagementState> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin can create projects." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const status = String(formData.get("status") ?? "PLANNING");
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientBudget = Number(formData.get("clientBudget") ?? 0) || 0;
  const techStack = extractMultiValue(formData, "techStack");
  const assignedUserIds = extractMultiValue(formData, "assignedUserIds");

  if (!techStack.length) {
    return {
      error: "Select at least one tech stack for the project.",
      values: { name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack },
    };
  }

  if (name.length < 2 || name.length > 120) {
    return { error: "Project name must be between 2 and 120 characters.", values: { name, summary, assignedUserIds, techStack } };
  }

  if (summary.length < 8 || summary.length > 600) {
    return {
      error: "Project summary must be between 8 and 600 characters.",
      values: { name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack },
    };
  }

  if (!PROJECT_STATUSES.includes(status as ProjectStatus) || !PROJECT_PRIORITIES.includes(priority as ProjectPriority)) {
    return { error: "Project status or priority is invalid.", values: { name, summary, dueDate, assignedUserIds, techStack } };
  }

  await connectDb();

  const resolvedAssignments = await resolveAssignedEmployeeIds(assignedUserIds);

  if (resolvedAssignments.error) {
    return {
      error: resolvedAssignments.error,
      values: { name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack },
    };
  }
  const assignedEmployeeIds = resolvedAssignments.value ?? [];

  const project = await ProjectModel.create({
    name,
    summary,
    status,
    priority,
    dueDate: dueDate ? new Date(dueDate) : null,
    techStack,
    assignedUserIds: assignedEmployeeIds,
    createdByUserId: session.user.id,
    clientName,
    clientBudget,
  });

  if (assignedEmployeeIds.length) {
    await UserModel.updateMany(
      { _id: { $in: assignedEmployeeIds } },
      { $addToSet: { projectIds: project._id.toString() } },
    );

    await notifyProjectAssignments({
      actorUserId: session.user.id,
      projectId: project._id.toString(),
      projectName: project.name,
      userIds: assignedEmployeeIds,
    });
  }

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dsr");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/projects");

  return {
    success: "Project created successfully.",
    values: { status: "PLANNING", priority: "MEDIUM", assignedUserIds: [], techStack: [] },
  };
}

export async function updateManagedProject(
  _previousState: ProjectManagementState,
  formData: FormData,
): Promise<ProjectManagementState> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin can update projects." };
  }

  const id = String(formData.get("projectId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const status = String(formData.get("status") ?? "PLANNING");
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientBudget = Number(formData.get("clientBudget") ?? 0) || 0;
  const techStack = extractMultiValue(formData, "techStack");
  const assignedUserIds = extractMultiValue(formData, "assignedUserIds");

  if (!techStack.length) {
    return {
      error: "Select at least one tech stack for the project.",
      values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack },
    };
  }

  if (!id) {
    return { error: "Project selection is required.", values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack } };
  }

  if (name.length < 2 || name.length > 120) {
    return { error: "Project name must be between 2 and 120 characters.", values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack } };
  }

  if (summary.length < 8 || summary.length > 600) {
    return {
      error: "Project summary must be between 8 and 600 characters.",
      values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack },
    };
  }

  if (!PROJECT_STATUSES.includes(status as ProjectStatus) || !PROJECT_PRIORITIES.includes(priority as ProjectPriority)) {
    return { error: "Project status or priority is invalid.", values: { id, name, summary, dueDate, assignedUserIds, techStack } };
  }

  await connectDb();

  const project = await ProjectModel.findById(id, { assignedUserIds: 1, name: 1 }).lean();

  if (!project) {
    return { error: "Selected project was not found.", values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack } };
  }

  const resolvedAssignments = await resolveAssignedEmployeeIds(assignedUserIds);

  if (resolvedAssignments.error) {
    return {
      error: resolvedAssignments.error,
      values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds, techStack },
    };
  }
  const nextAssignments = resolvedAssignments.value ?? [];

  const previousAssignments = Array.from(new Set(project.assignedUserIds ?? []));
  const removedAssignments = previousAssignments.filter((userId) => !nextAssignments.includes(userId));
  const addedAssignments = nextAssignments.filter((userId) => !previousAssignments.includes(userId));

  await ProjectModel.findByIdAndUpdate(id, {
    name,
    summary,
    status,
    priority,
    dueDate: dueDate ? new Date(dueDate) : null,
    techStack,
    assignedUserIds: nextAssignments,
    clientName,
    clientBudget,
  });

  if (removedAssignments.length) {
    await UserModel.updateMany({ _id: { $in: removedAssignments } }, { $pull: { projectIds: id } });
  }

  if (nextAssignments.length) {
    await UserModel.updateMany({ _id: { $in: nextAssignments } }, { $addToSet: { projectIds: id } });
  }

  if (addedAssignments.length) {
    await notifyProjectAssignments({
      actorUserId: session.user.id,
      projectId: id,
      projectName: name,
      userIds: addedAssignments,
    });
  }

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dsr");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/projects");

  return {
    success: "Project updated successfully.",
    values: { id, name, summary, status: safeStatus(status), priority: safePriority(priority), dueDate, assignedUserIds: nextAssignments, techStack },
  };
}

export async function assignProjectToUser(formData: FormData) {
  const session = await getCurrentSession();
  assertAdminOrManager(session);

  const userId = String(formData.get("userId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!userId || !projectId) {
    return;
  }

  await connectDb();

  const [targetUser, project] = await Promise.all([
    UserModel.findById(userId, { role: 1, fullName: 1, projectIds: 1 }).lean(),
    ProjectModel.findById(projectId, { name: 1 }).lean(),
  ]);

  const ASSIGNABLE_ROLES = ["EMPLOYEE", "MANAGER", "SUPER_ADMIN"];
  if (!targetUser || !ASSIGNABLE_ROLES.includes(targetUser.role)) {
    throw new Error("Projects can only be assigned to employees, managers, or admins.");
  }

  if (!project) {
    throw new Error("Selected project was not found.");
  }

  const alreadyAssigned = (targetUser.projectIds ?? []).includes(projectId);

  await Promise.all([
    UserModel.findByIdAndUpdate(userId, { $addToSet: { projectIds: projectId } }),
    ProjectModel.findByIdAndUpdate(projectId, { $addToSet: { assignedUserIds: userId } }),
  ]);

  if (!alreadyAssigned) {
    await createNotificationsForUsers([userId], {
      actorUserId: session.user.id,
      type: "PROJECT_ASSIGNED",
      title: "New project assigned",
      message: `${project.name} has been assigned to you. Open DSR to start reporting work on it.`,
      actionUrl: "/dashboard/dsr",
      sourceKey: `project-assigned:${projectId}`,
    });
  }

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dsr");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/projects");
}

export async function markProjectClosedByEmployee(
  _previousState: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "EMPLOYEE") {
    return { error: "Only employees can mark projects as closed." };
  }

  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!projectId) {
    return { error: "Project selection is required." };
  }

  await connectDb();

  const project = await ProjectModel.findOne(
    { _id: projectId, assignedUserIds: session.user.id },
    { _id: 1, name: 1, status: 1, closedByEmployeeId: 1 },
  ).lean();

  if (!project) {
    return { error: "Project not found or you are not assigned to it." };
  }

  if (project.closedByEmployeeId) {
    return { error: "This project has already been marked as closed." };
  }

  if (project.status === "COMPLETED") {
    return { error: "This project is already marked as completed by admin." };
  }

  await ProjectModel.findByIdAndUpdate(projectId, {
    status: "COMPLETED",
    closedByEmployeeId: session.user.id,
    closedByEmployeeAt: new Date(),
  });

  // Notify all super admins + managers so they see it in dashboard notifications
  const leaders = await UserModel.find(
    { role: { $in: ["SUPER_ADMIN", "MANAGER"] }, status: "ACTIVE" },
    { _id: 1 },
  ).lean();

  const leaderIds = leaders.map((l) => l._id.toString());

  if (leaderIds.length) {
    await createNotificationsForUsers(leaderIds, {
      actorUserId: session.user.id,
      type: "PROJECT_ASSIGNED",
      title: "Project marked as complete",
      message: `${session.user.fullName} has marked "${project.name}" as complete.`,
      actionUrl: "/dashboard/projects",
      sourceKey: `project-closed-by-emp:${projectId}:${session.user.id}`,
    });
  }

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dsr");
  revalidatePath("/dashboard/tasks");

  return { success: `"${project.name}" has been marked as closed. Admin has been notified.` };
}

export async function deleteManagedProject(formData: FormData) {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    throw new Error("Only admin can delete projects.");
  }

  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!projectId) {
    throw new Error("Project selection is required.");
  }

  await connectDb();

  const project = await ProjectModel.findById(projectId, { _id: 1 }).lean();

  if (!project) {
    throw new Error("Selected project was not found.");
  }

  await Promise.all([
    ProjectModel.findByIdAndDelete(projectId),
    UserModel.updateMany({ projectIds: projectId }, { $pull: { projectIds: projectId } }),
  ]);

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dsr");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/projects");
}

function safeStatus(value: string): ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus) ? (value as ProjectStatus) : "PLANNING";
}

function safePriority(value: string): ProjectPriority {
  return PROJECT_PRIORITIES.includes(value as ProjectPriority) ? (value as ProjectPriority) : "MEDIUM";
}

function extractMultiValue(formData: FormData, name: string) {
  const directValues = formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (directValues.length) {
    return Array.from(new Set(directValues));
  }

  const csvValue = String(formData.get(`${name}Csv`) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(csvValue));
}

async function resolveAssignedEmployeeIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (!uniqueUserIds.length) {
    return { value: [] as string[] };
  }

  const employees = await UserModel.find({ _id: { $in: uniqueUserIds } }, { role: 1, status: 1 }).lean();

  if (employees.length !== uniqueUserIds.length) {
    return { error: "One or more selected team members were not found." };
  }

  const ASSIGNABLE_ROLES = ["EMPLOYEE", "MANAGER", "SUPER_ADMIN"];
  const invalidEmployee = employees.find(
    (user) => !ASSIGNABLE_ROLES.includes(user.role) || user.status !== "ACTIVE",
  );

  if (invalidEmployee) {
    return { error: "Projects can only be assigned to active employees, managers, and admins." };
  }

  return { value: uniqueUserIds };
}

async function notifyProjectAssignments({
  actorUserId,
  projectId,
  projectName,
  userIds,
}: {
  actorUserId: string;
  projectId: string;
  projectName: string;
  userIds: string[];
}) {
  await createNotificationsForUsers(userIds, {
    actorUserId,
    type: "PROJECT_ASSIGNED",
    title: "New project assigned",
    message: `${projectName} has been assigned to you. Open DSR to review the project details and start reporting work on it.`,
    actionUrl: "/dashboard/dsr",
    sourceKey: `project-assigned:${projectId}`,
  });
}



