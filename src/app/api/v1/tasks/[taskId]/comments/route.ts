import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { TaskModel } from "@/database/mongodb/models/task";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { taskId } = await context.params;
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = String(body?.message ?? "").trim();

  if (message.length < 2 || message.length > 600) {
    return NextResponse.json(
      { error: "Comment message must be between 2 and 600 characters." },
      { status: 400 },
    );
  }

  await connectDb();
  const task = await TaskModel.findById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const canComment =
    task.assignedUserId === session.user.id ||
    task.assignedByUserId === session.user.id ||
    ["SUPER_ADMIN", "MANAGER"].includes(session.user.role);
  if (!canComment) {
    return NextResponse.json({ error: "You do not have access to this task." }, { status: 403 });
  }

  task.comments.push({
    userId: session.user.id,
    userName: session.user.fullName,
    role: session.user.role,
    message,
    createdAt: new Date(),
  });
  await task.save();

  return NextResponse.json({
    ok: true,
    comment: {
      userId: session.user.id,
      userName: session.user.fullName,
      message,
      createdAt: new Date().toISOString(),
    },
  });
}
