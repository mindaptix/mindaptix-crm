import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { PROJECT_STATUSES, ProjectModel } from "@/database/mongodb/models/project";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50), 100);
  const status = searchParams.get("status")?.trim().toUpperCase();
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  if (status && !PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid project status." }, { status: 400 });
  }

  const filter: Record<string, unknown> = { archivedAt: null };
  if (["EMPLOYEE", "SALES"].includes(session.user.role)) {
    filter.$or = [
      { assignedUserIds: session.user.id },
      { _id: { $in: session.user.projectIds } },
    ];
  }
  if (status) {
    filter.status = status;
  } else if (!includeCompleted) {
    filter.status = { $ne: "COMPLETED" };
  }

  await connectDb();
  const projects = await ProjectModel.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      summary: project.summary,
      status: project.status,
      priority: project.priority,
      dueDate: project.dueDate?.toISOString() ?? null,
      techStack: project.techStack ?? [],
      repositoryUrls: project.repositoryUrls ?? [],
      assignedUserIds: project.assignedUserIds ?? [],
      clientName: project.clientName ?? "",
      createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
    })),
  });
}
