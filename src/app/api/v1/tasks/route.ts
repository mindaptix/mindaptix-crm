import connectDb from "@/database/mongodb/connect";
import { TaskModel, TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import { requireSession, jsonError, jsonOk } from "@/app/api/v1/_lib/http";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@/features/tasks/constants";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toNumber(value: string | null, fallback: number) {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function canReadOtherUsersTasks(role: string) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function GET(request: Request) {
  const session = await requireSession();
  await connectDb();

  const url = new URL(request.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(url.searchParams.get("limit"), DEFAULT_LIMIT)));
  const statusParam = (url.searchParams.get("status") ?? "").trim().toUpperCase();
  const status = TASK_STATUSES.includes(statusParam as TaskStatus) ? (statusParam as TaskStatus) : undefined;
  const assignedUserIdParam = (url.searchParams.get("assignedUserId") ?? "").trim();
  const assignedUserId =
    assignedUserIdParam && canReadOtherUsersTasks(session.user.role) ? assignedUserIdParam : session.user.id;

  const q: Record<string, unknown> = { assignedUserId };
  if (status) q.status = status;

  const tasks = await TaskModel.find(q)
    .sort({ deadlineAt: 1, createdAt: -1 })
    .limit(limit)
    .lean();

  const userIds = Array.from(
    new Set(tasks.flatMap((t) => [t.assignedUserId, t.assignedByUserId]).filter(Boolean)),
  );
  const users = await UserModel.find({ _id: { $in: userIds } }, { fullName: 1, role: 1 }).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), { id: u._id.toString(), fullName: u.fullName, role: u.role }]));

  return jsonOk({
    tasks: tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      labels: t.labels ?? [],
      workDate: t.workDate ?? "",
      dueDate: t.dueDate,
      deadlineAt: t.deadlineAt ? new Date(t.deadlineAt).toISOString() : null,
      deadlineMissedAt: t.deadlineMissedAt ? new Date(t.deadlineMissedAt).toISOString() : null,
      assignedUser: userMap.get(t.assignedUserId) ?? { id: t.assignedUserId, fullName: "", role: "" },
      assignedByUser: userMap.get(t.assignedByUserId) ?? { id: t.assignedByUserId, fullName: "", role: "" },
      attachments: t.attachments ?? [],
      comments: (t.comments ?? []).map((c) => ({
        id: c._id?.toString?.() ?? "",
        userId: c.userId,
        userName: c.userName,
        role: c.role,
        message: c.message,
        createdAt: new Date(c.createdAt).toISOString(),
      })),
      checklist: t.checklist ?? [],
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
      reviewedAt: t.reviewedAt ? new Date(t.reviewedAt).toISOString() : null,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!["EMPLOYEE", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
    return jsonError(403, { error: "Forbidden." });
  }

  let body: {
    title?: string;
    description?: string;
    assignedUserId?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: string;
    labels?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body." });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const selfTask = session.user.role === "EMPLOYEE";
  const assignedUserId = selfTask ? session.user.id : String(body.assignedUserId ?? "").trim();
  const dueDate = String(body.dueDate ?? "").trim();
  const dueTime = String(body.dueTime ?? "23:59").trim();
  const priorityRaw = String(body.priority ?? "MEDIUM").trim().toUpperCase();
  const priority: TaskPriority = TASK_PRIORITIES.includes(priorityRaw as TaskPriority) ? (priorityRaw as TaskPriority) : "MEDIUM";
  const labels = Array.from(new Set((body.labels ?? []).map((l) => String(l).trim().toUpperCase()).filter(Boolean)));

  if (title.length < 3 || title.length > 160) return jsonError(400, { error: "Task title must be between 3 and 160 characters." });
  if (description.length < 6 || description.length > TASK_DESCRIPTION_MAX_LENGTH) {
    return jsonError(400, { error: `Task description must be between 6 and ${TASK_DESCRIPTION_MAX_LENGTH.toLocaleString("en-IN")} characters.` });
  }
  if (!assignedUserId) return jsonError(400, { error: "assignedUserId is required." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return jsonError(400, { error: "dueDate must be YYYY-MM-DD." });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) return jsonError(400, { error: "dueTime must be HH:MM (24h)." });

  await connectDb();
  const employee = await UserModel.findById(assignedUserId, { role: 1 }).lean();
  if (!employee) return jsonError(400, { error: "Invalid assignedUserId." });

  const deadlineAt = new Date(`${dueDate}T${dueTime}:00+05:30`);
  if (!Number.isFinite(deadlineAt.getTime()) || deadlineAt.getTime() <= Date.now()) {
    return jsonError(400, { error: "Choose a future deadline in IST." });
  }

  const created = await TaskModel.create({
    title,
    description,
    assignedUserId,
    assignedByUserId: session.user.id,
    workDate: "",
    dueDate,
    deadlineAt,
    priority,
    labels,
    attachments: [],
  });

  return jsonOk({ taskId: created._id.toString() }, { status: 201 });
}

