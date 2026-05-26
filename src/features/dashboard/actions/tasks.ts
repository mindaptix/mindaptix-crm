"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { createNotificationsForUsers } from "@/features/notifications/service";
import { TASK_LABELS, TASK_PRIORITIES, TASK_STATUSES, TaskModel, type TaskLabel, type TaskPriority, type TaskStatus } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import { saveTaskAttachments } from "@/shared/storage/uploads/work-attachments";

type TaskState = {
  error?: string;
  success?: string;
  values?: {
    title?: string;
    description?: string;
    assignedUserId?: string;
    dueDate?: string;
    priority?: TaskPriority;
    labels?: string[];
  };
};

export async function createTask(_previousState: TaskState, formData: FormData): Promise<TaskState> {
  const session = await getCurrentSession();

  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN")) {
    return { error: "Only admin can assign tasks." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedUserId = String(formData.get("assignedUserId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const labels = formData
    .getAll("labels")
    .map((value) => String(value).trim().toUpperCase())
    .filter((value): value is TaskLabel => TASK_LABELS.includes(value as TaskLabel));
  const attachmentFiles = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (
    title.length < 3 ||
    description.length < 6 ||
    !assignedUserId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    !TASK_PRIORITIES.includes(priority as TaskPriority)
  ) {
    return {
      error: "Fill title, description, employee, priority, and due date.",
      values: { title, description, assignedUserId, dueDate, priority: "MEDIUM", labels },
    };
  }

  await connectDb();

  const employee = await UserModel.findById(assignedUserId, { role: 1 }).lean();

  if (!employee || employee.role !== "EMPLOYEE") {
    return { error: "Tasks can only be assigned to employee accounts.", values: { title, description, assignedUserId, dueDate } };
  }

  const attachments = await saveTaskAttachments(attachmentFiles);

  const createdTask = await TaskModel.create({
    title,
    description,
    assignedUserId,
    assignedByUserId: session.user.id,
    dueDate,
    priority,
    labels,
    attachments,
  });

  await createNotificationsForUsers([assignedUserId], {
    actorUserId: session.user.id,
    type: "TASK_ASSIGNED",
    title: "New task assigned",
    message: `${title} was assigned with ${priority.toLowerCase()} priority and due on ${dueDate}.`,
    actionUrl: "/dashboard/tasks",
    sourceKey: `task-assigned:${createdTask._id.toString()}`,
  });

  revalidatePath("/dashboard/tasks");
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

  if (!taskId || !TASK_STATUSES.includes(status as TaskStatus)) {
    throw new Error("Invalid task update.");
  }

  await connectDb();

  const task = await TaskModel.findById(taskId).lean();

  if (!task) {
    throw new Error("Task not found.");
  }

  if (
    session.user.role !== "MANAGER" &&
    task.assignedUserId !== session.user.id
  ) {
    throw new Error("You cannot update this task.");
  }

  await TaskModel.findByIdAndUpdate(taskId, {
    status,
    completedAt: status === "COMPLETED" ? new Date() : null,
  });

  if (session.user.id !== task.assignedByUserId) {
    await createNotificationsForUsers([task.assignedByUserId], {
      actorUserId: session.user.id,
      type: "TASK_COMMENT",
      title: "Task status updated",
      message: `${task.title} is now ${status.replaceAll("_", " ").toLowerCase()}.`,
      actionUrl: "/dashboard/tasks",
    });
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
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



