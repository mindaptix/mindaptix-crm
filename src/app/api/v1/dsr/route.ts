import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { submitDailyUpdate } from "@/features/dashboard/actions/dsr";
import connectDb from "@/database/mongodb/connect";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { ProjectModel } from "@/database/mongodb/models/project";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can view personal DSR data." }, { status: 403 });
  }

  await connectDb();
  const [projects, updates] = await Promise.all([
    ProjectModel.find({ assignedUserIds: session.user.id, archivedAt: null })
      .sort({ createdAt: -1 })
      .lean(),
    DailyUpdateModel.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);
  const projectNames = new Map(projects.map((project) => [project._id.toString(), project.name]));
  const today = formatIndiaDateKey();

  return NextResponse.json({
    today,
    hasTodayDsr: updates.some((update) => update.workDate === today),
    totalDsr: updates.length,
    projects: projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      summary: project.summary,
      status: project.status,
      priority: project.priority,
      dueDate: project.dueDate?.toISOString() ?? null,
      techStack: project.techStack ?? [],
    })),
    updates: updates.map((update) => ({
      id: update._id.toString(),
      workDate: update.workDate,
      projectId: update.projectId ?? "",
      projectName: update.projectId ? projectNames.get(update.projectId) ?? "General" : "General Update",
      summary: update.summary,
      accomplishments: update.accomplishments,
      blockers: update.blockers ?? "",
      nextPlan: update.nextPlan ?? "",
      githubRepoUrls: update.githubRepoUrls ?? [],
      attachments: update.attachments ?? [],
    })),
    submissionPolicyMessage:
      "Missed DSRs can be submitted only until Friday of the same work week. After Friday, previous-week DSRs are locked.",
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can submit daily updates." }, { status: 403 });
  }

  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const formData = isMultipart ? await request.formData() : new FormData();
  if (isMultipart) {
    const encodedRepositories = String(formData.get("githubRepoUrls") ?? "");
    formData.delete("githubRepoUrls");
    if (encodedRepositories) {
      for (const url of encodedRepositories.split("\n").map((value) => value.trim()).filter(Boolean)) {
        formData.append("githubRepoUrl", url);
      }
    }
  } else {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    for (const key of ["summary", "accomplishments", "blockers", "nextPlan", "projectId", "workDate", "githubUsername", "githubBranch"]) {
      if (body[key]) formData.append(key, String(body[key]));
    }
    const repositories = Array.isArray(body.githubRepoUrls) ? body.githubRepoUrls : [body.githubRepoUrl];
    for (const url of repositories) if (url) formData.append("githubRepoUrl", String(url));
  }

  const result = await submitDailyUpdate({}, formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.success ?? "Daily update saved.",
    values: result.values,
  });
}
