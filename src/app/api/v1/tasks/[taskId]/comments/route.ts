import connectDb from "@/database/mongodb/connect";
import { TaskModel } from "@/database/mongodb/models/task";
import { createNotificationsForUsers } from "@/features/notifications/service";
import { requireSession, jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await requireSession();
  const { taskId } = await params;

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body." });
  }

  const message = String(body.message ?? "").trim();
  if (message.length < 2) return jsonError(400, { error: "Comment message is too short." });

  await connectDb();
  const task = await TaskModel.findById(taskId).lean();
  if (!task) return jsonError(404, { error: "Task not found." });

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "MANAGER" ||
    task.assignedUserId === session.user.id ||
    task.assignedByUserId === session.user.id;
  if (!canAccess) return jsonError(403, { error: "You cannot comment on this task." });

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

  const recipients = [task.assignedUserId, task.assignedByUserId].filter((id) => id && id !== session.user.id);
  if (recipients.length) {
    await createNotificationsForUsers(recipients, {
      actorUserId: session.user.id,
      type: "TASK_COMMENT",
      title: "New task comment",
      message: `${session.user.fullName} added an update on ${task.title}.`,
      actionUrl: "/dashboard/tasks",
    });
  }

  return jsonOk({ ok: true });
}

