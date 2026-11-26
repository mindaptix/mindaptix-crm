import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { TaskModel } from "@/database/mongodb/models/task";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "").trim().toUpperCase();

  const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}` },
      { status: 400 },
    );
  }

  await connectDb();
  const task = await TaskModel.findById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.assignedUserId !== session.user.id) {
    return NextResponse.json({ error: "Only the assigned employee can update this task." }, { status: 403 });
  }
  if (["CLOSED", "FAILED"].includes(task.status)) {
    return NextResponse.json({ error: "This task cannot be reopened." }, { status: 400 });
  }

  task.status = status as "PENDING" | "IN_PROGRESS" | "COMPLETED";
  if (status === "COMPLETED") {
    task.completedAt = new Date();
  } else {
    task.completedAt = null;
  }
  await task.save();

  return NextResponse.json({
    ok: true,
    task: {
      id: task._id.toString(),
      title: task.title,
      status: task.status,
    },
  });
}
