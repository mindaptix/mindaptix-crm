"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { createNotificationsForUsers } from "@/features/notifications/service";
import { NotificationModel } from "@/database/mongodb/models/notification";
import { TASK_LABELS, TASK_PRIORITIES, TaskModel, type TaskLabel, type TaskPriority } from "@/database/mongodb/models/task";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@/features/tasks/constants";
import { UserModel } from "@/database/mongodb/models/user";
import { saveTaskAttachments } from "@/shared/storage/uploads/work-attachments";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

import { parseTaskDeadline, taskDeadline, missedTaskDeadline } from "@/features/tasks/deadline";

const EMPLOYEE_ALLOWED_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

type TaskState = {
  error?: string;
  success?: string;
  values?: {
    title?: string;
    description?: string;
    assignedUserId?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: TaskPriority;
    labels?: string[];
  };
};

export async function createTask(_previousState: TaskState, formData: FormData): Promise<TaskState> {
  const session = await getCurrentSession();

  if (!session || !["EMPLOYEE", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
    return { error: "Only admin can assign tasks." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const selfTask = session.user.role === "EMPLOYEE";
  const workDate = formatIndiaDateKey(new Date());
  const assignedUserId = selfTask ? session.user.id : String(formData.get("assignedUserId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") || formatIndiaDateKey(new Date(Date.now() + 86_400_000))).trim();
  const dueTime = String(formData.get("dueTime") || "23:59").trim();
  const deadlineAt = parseTaskDeadline(dueDate, dueTime);
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const labels = formData
    .getAll("labels")
    .map((value) => String(value).trim().toUpperCase())
    .filter((value): value is TaskLabel => TASK_LABELS.includes(value as TaskLabel));
  const attachmentFiles = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (title.length < 3 || title.length > 160) {
    return { error: "Task title must be between 3 and 160 characters.", values: { title, description, assignedUserId, dueDate, dueTime, priority: "MEDIUM", labels } };
  }
  if (description.length < 6 || description.length > TASK_DESCRIPTION_MAX_LENGTH) {
    return { error: `Description must be between 6 and ${TASK_DESCRIPTION_MAX_LENGTH.toLocaleString("en-IN")} characters.`, values: { title, description, assignedUserId, dueDate, dueTime, priority: "MEDIUM", labels } };
  }
  if (!assignedUserId) {
    return { error: "Select the employee this task is for.", values: { title, description, assignedUserId, dueDate, dueTime, priority: "MEDIUM", labels } };
  }
  if (!deadlineAt || deadlineAt.getTime() <= Date.now()) {
    return {
      error: "Choose a future deadline in IST. If you select today, choose a time later than the current time.",
      values: { title, description, assignedUserId, dueDate, dueTime, priority: "MEDIUM", labels },
    };
  }
  if (!TASK_PRIORITIES.includes(priority as TaskPriority)) return { error: "Select a valid priority.", values: { title, description, assignedUserId, dueDate, dueTime, priority: "MEDIUM", labels } };

  await connectDb();

  const employee = await UserModel.findById(assignedUserId, { role: 1, fullName: 1 }).lean();

  const TASK_ASSIGNABLE_ROLES = ["EMPLOYEE", "SALES", "MANAGER", "SUPER_ADMIN"] as const;
  if (!employee || !TASK_ASSIGNABLE_ROLES.includes(employee.role as (typeof TASK_ASSIGNABLE_ROLES)[number])) {
    return { error: "Please select a valid employee, sales user, admin, or super admin to assign this task.", values: { title, description, assignedUserId, dueDate, dueTime } };
  }

  const attachments = await saveTaskAttachments(attachmentFiles);

  const createdTask = await TaskModel.create({
    title,
    description,
    assignedUserId,
    assignedByUserId: session.user.id,
    workDate,
    dueDate,
    deadlineAt,
    priority: priority as TaskPriority,
    labels,
    attachments,
  });

  await createNotificationsForUsers([assignedUserId], {
    actorUserId: session.user.id,
    type: "TASK_ASSIGNED",
    title: "New task assigned",
    message: `${title} was assigned with ${priority.toLowerCase()} priority and due on ${dueDate} at ${dueTime} IST.`,
    actionUrl: "/dashboard/tasks",
    sourceKey: `task-assigned:${createdTask._id.toString()}`,
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");

  return { success: "Task assigned successfully." };
}

export async function updateTaskStatus(formData: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!taskId || !EMPLOYEE_ALLOWED_STATUSES.includes(status as (typeof EMPLOYEE_ALLOWED_STATUSES)[number])) {
    throw new Error("Invalid task update.");
  }

  await connectDb();

  const task = await TaskModel.findById(taskId).lean();

  if (!task) {
    throw new Error("Task not found.");
  }

  if (task.assignedUserId !== session.user.id) {
    throw new Error("Only the assigned employee can update this task's status.");
  }

  if (task.status === "CLOSED") throw new Error("Accepted tasks cannot be reopened.");
  const now = new Date();
  await TaskModel.findByIdAndUpdate(taskId, {
    status,
    completedAt: status === "COMPLETED" ? (task.status === "COMPLETED" ? task.completedAt ?? now : now) : null,
    ...(missedTaskDeadline(task, now) ? { deadlineMissedAt: task.deadlineMissedAt ?? taskDeadline(task) } : {}),
  });

  // When employee submits for review, notify the assigner (admin)
  if (status === "COMPLETED" && session.user.id !== task.assignedByUserId) {
    await createNotificationsForUsers([task.assignedByUserId], {
      actorUserId: session.user.id,
      type: "TASK_COMMENT",
      title: "Task submitted for review",
      message: `${task.title} has been marked complete and is awaiting your review.`,
      actionUrl: "/dashboard/tasks",
      sourceKey: `task-status:${taskId}:${status}:${Date.now()}`,
    });
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
}

export async function reviewTask(formData: FormData) {
  const session = await getCurrentSession();

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    throw new Error("Only admins can review tasks.");
  }

  const taskId = String(formData.get("taskId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!taskId || (action !== "ACCEPT" && action !== "REJECT")) {
    throw new Error("Invalid review action.");
  }

  await connectDb();

  const task = await TaskModel.findById(taskId).lean();

  if (!task) {
    throw new Error("Task not found.");
  }

  if (task.status !== "COMPLETED") {
    throw new Error("Only completed tasks can be reviewed.");
  }

  const newStatus = action === "ACCEPT" ? "CLOSED" : "REJECTED";

  await TaskModel.findByIdAndUpdate(taskId, {
    status: newStatus,
    reviewedAt: new Date(),
    ...(missedTaskDeadline(task) ? { deadlineMissedAt: task.deadlineMissedAt ?? taskDeadline(task) } : {}),
  });

  const notifTitle = action === "ACCEPT" ? "Task accepted" : "Task rejected";
  const notifMessage =
    action === "ACCEPT"
      ? `Your task "${task.title}" has been accepted and closed.`
      : `Your task "${task.title}" was rejected. Please review and resubmit.`;

  await createNotificationsForUsers([task.assignedUserId], {
    actorUserId: session.user.id,
    type: "TASK_COMMENT",
    title: notifTitle,
    message: notifMessage,
    actionUrl: "/dashboard/tasks",
    sourceKey: `task-review:${taskId}:${newStatus}:${Date.now()}`,
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
}

export async function closeTask(formData: FormData): Promise<{ error?: string }> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return { error: "Only the super admin can close tasks." };
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) return { error: "Task ID is required." };

  await connectDb();
  const task = await TaskModel.findById(taskId).lean();
  if (!task) return { error: "Task not found." };
  if (task.status === "CLOSED") return {};

  const closedAt = new Date();
  await TaskModel.findByIdAndUpdate(taskId, {
    status: "CLOSED",
    completedAt: task.completedAt ?? closedAt,
    reviewedAt: closedAt,
    ...(missedTaskDeadline(task, closedAt) ? { deadlineMissedAt: task.deadlineMissedAt ?? taskDeadline(task) } : {}),
  });
  if (task.assignedUserId !== session.user.id) {
    await createNotificationsForUsers([task.assignedUserId], {
      actorUserId: session.user.id,
      type: "TASK_COMMENT",
      title: "Task closed",
      message: `"${task.title}" was closed by the super admin because it is no longer required.`,
      actionUrl: "/dashboard/tasks",
      sourceKey: `task-closed:${taskId}:${closedAt.getTime()}`,
    });
  }
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteTask(formData: FormData): Promise<{ error?: string }> {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can delete tasks." };
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) return { error: "Task ID is required." };

  await connectDb();

  const task = await TaskModel.findById(taskId, { _id: 1 }).lean();
  if (!task) return { error: "Task not found." };

  await Promise.all([
    TaskModel.findByIdAndDelete(taskId),
    NotificationModel.deleteMany({ sourceKey: { $regex: `^task-assigned:${taskId}` } }),
  ]);

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");

  return {};
}

export async function addTaskComment(formData: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  const taskId = String(formData.get("taskId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!taskId || message.length < 2) {
    throw new Error("Comment message is too short.");
  }

  await connectDb();

  const task = await TaskModel.findById(taskId).lean();

  if (!task) {
    throw new Error("Task not found.");
  }

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "MANAGER" ||
    task.assignedUserId === session.user.id ||
    task.assignedByUserId === session.user.id;

  if (!canAccess) {
    throw new Error("You cannot comment on this task.");
  }

  await TaskModel.findByIdAndUpdate(taskId, {
    $push: {
      comments: {
        userId: session.user.id,
        userName: session.user.fullName,
        role: session.user.role,
        message,
        createdAt: new Date(),
      },
    },
  });

  const recipients = [task.assignedUserId, task.assignedByUserId].filter((userId) => userId !== session.user.id);
  await createNotificationsForUsers(recipients, {
    actorUserId: session.user.id,
    type: "TASK_COMMENT",
    title: "New task comment",
    message: `${session.user.fullName} added an update on ${task.title}.`,
    actionUrl: "/dashboard/tasks",
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
}
