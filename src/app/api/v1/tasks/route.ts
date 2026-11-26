import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { TaskModel, TASK_LABELS, type TaskLabel, type TaskPriority } from "@/database/mongodb/models/task";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";
import { parseTaskDeadline } from "@/features/tasks/deadline";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@/features/tasks/constants";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 50);
  const status = searchParams.get("status")?.trim().toUpperCase();
  const assignedUserId = searchParams.get("assignedUserId")?.trim();
  const includeClosed = searchParams.get("includeClosed") === "true";

  await connectDb();

  const filter: Record<string, unknown> = {};

  if (session.user.role === "EMPLOYEE") {
    filter.assignedUserId = session.user.id;
  } else if (assignedUserId) {
    filter.assignedUserId = assignedUserId;
  }

  if (status) {
    filter.status = status;
  } else if (!includeClosed) {
    filter.status = { $nin: ["COMPLETED", "CLOSED"] };
  }

  const tasks = await TaskModel.find(filter)
    .sort({ deadlineAt: 1, createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      dueTime: t.deadlineAt ? formatIndiaTimeKey(t.deadlineAt) : "",
      deadlineAt: t.deadlineAt ? t.deadlineAt.toISOString() : null,
      assignedUserId: t.assignedUserId,
      assignedByUserId: t.assignedByUserId,
      labels: t.labels ?? [],
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    assignedUserId?: unknown;
    dueDate?: unknown;
    dueTime?: unknown;
    priority?: unknown;
    labels?: unknown;
  } | null;

  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const selfTask = session.user.role === "EMPLOYEE";
  const assignedUserId = selfTask ? session.user.id : String(body?.assignedUserId ?? "").trim();
  const dueDate = String(body?.dueDate || formatIndiaDateKey(new Date(Date.now() + 86_400_000))).trim();
  const dueTime = String(body?.dueTime || "23:59").trim();
  const deadlineAt = parseTaskDeadline(dueDate, dueTime);
  const priority = String(body?.priority ?? "MEDIUM").toUpperCase() as TaskPriority;
  const rawLabels = Array.isArray(body?.labels) ? body.labels : [];
  const labels = rawLabels
    .map((v) => String(v).trim().toUpperCase())
    .filter((v): v is TaskLabel => TASK_LABELS.includes(v as TaskLabel));

  if (title.length < 3 || title.length > 160) {
    return NextResponse.json({ error: "Task title must be between 3 and 160 characters." }, { status: 400 });
  }
  if (description.length < 6 || description.length > TASK_DESCRIPTION_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Description must be between 6 and ${TASK_DESCRIPTION_MAX_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (!assignedUserId) {
    return NextResponse.json({ error: "Assigned user is required." }, { status: 400 });
  }

  await connectDb();

  const task = new TaskModel({
    title,
    description,
    workDate: formatIndiaDateKey(),
    dueDate,
    deadlineAt,
    priority: ["LOW", "MEDIUM", "HIGH"].includes(priority) ? priority : "MEDIUM",
    labels,
    assignedUserId,
    assignedByUserId: session.user.id,
    status: "PENDING",
  });
  await task.save();

  return NextResponse.json(
    {
      task: {
        id: task._id.toString(),
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        priority: task.priority,
      },
    },
    { status: 201 },
  );
}
