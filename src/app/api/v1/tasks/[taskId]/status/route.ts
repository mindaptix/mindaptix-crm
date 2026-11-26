import connectDb from "@/database/mongodb/connect";
import { TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import { createNotificationsForUsers } from "@/features/notifications/service";
import { missedTaskDeadline, taskDeadline } from "@/features/tasks/deadline";
import { requireSession, jsonError, jsonOk } from "@/app/api/v1/_lib/http";

const EMPLOYEE_ALLOWED_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await requireSession();
  const { taskId } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body." });
  }

  const status = String(body.status ?? "").trim().toUpperCase();
  if (!EMPLOYEE_ALLOWED_STATUSES.includes(status as (typeof EMPLOYEE_ALLOWED_STATUSES)[number])) {
    return jsonError(400, { error: "Invalid status." });
  }

  await connectDb();
  const task = await TaskModel.findById(taskId).lean();
  if (!task) return jsonError(404, { error: "Task not found." });

  if (task.assignedUserId !== session.user.id) {
    return jsonError(403, { error: "Only the assigned employee can update this task's status." });
  }
  if (task.status === "CLOSED") return jsonError(400, { error: "Accepted tasks cannot be reopened." });
  if (task.status === "FAILED") return jsonError(400, { error: "Failed tasks cannot be reopened by employees." });

  const now = new Date();
  await TaskModel.findByIdAndUpdate(taskId, {
    status,
    completedAt: status === "COMPLETED" ? (task.status === "COMPLETED" ? task.completedAt ?? now : now) : null,
    ...(missedTaskDeadline(task, now) ? { deadlineMissedAt: task.deadlineMissedAt ?? taskDeadline(task) } : {}),
  });

  if (status === "COMPLETED" && task.status !== "COMPLETED") {
    const approvers = await UserModel.find({ role: "SUPER_ADMIN", status: "ACTIVE" }, { _id: 1 }).lean();
    await createNotificationsForUsers(approvers.map((u) => u._id.toString()), {
      actorUserId: session.user.id,
      type: "TASK_COMMENT",
      title: "Task closure requested",
      message: `${session.user.fullName} requested closure of "${task.title}". Review and approve closure to allow normal logout.`,
      actionUrl: "/dashboard/tasks",
      sourceKey: `task-status:${taskId}:${status}:${Date.now()}`,
    });
  }

  return jsonOk({ ok: true });
}

