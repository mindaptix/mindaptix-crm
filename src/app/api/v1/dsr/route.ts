import { jsonError, jsonOk, requireSession } from "@/app/api/v1/_lib/http";
import connectDb from "@/database/mongodb/connect";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { ProjectModel } from "@/database/mongodb/models/project";
import { submitDailyUpdate } from "@/features/dashboard/actions/dsr";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session.user.role !== "EMPLOYEE") {
    return jsonError(403, { error: "Only employees can view personal DSR data." });
  }

  await connectDb();
  const [projects, updates, totalDsr] = await Promise.all([
    ProjectModel.find({ assignedUserIds: session.user.id, archivedAt: null })
      .sort({ createdAt: -1 })
      .lean(),
    DailyUpdateModel.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    DailyUpdateModel.countDocuments({ userId: session.user.id }),
  ]);
  const projectNames = new Map(
    projects.map((project) => [project._id.toString(), project.name]),
  );
  const today = formatIndiaDateKey();

  return jsonOk({
    today,
    hasTodayDsr: updates.some((update) => update.workDate === today),
    totalDsr,
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
      projectName: update.projectId
        ? projectNames.get(update.projectId) ?? "General"
        : "General Update",
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
  await requireSession();

  const contentType = request.headers.get("content-type") ?? "";
  let form: FormData;

  if (contentType.includes("multipart/form-data")) {
    form = await request.formData();
    const encodedRepositories = String(form.get("githubRepoUrls") ?? "");
    form.delete("githubRepoUrls");
    for (const url of encodedRepositories
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)) {
      form.append("githubRepoUrl", url);
    }
  } else {
    let body: {
      summary?: string;
      accomplishments?: string;
      blockers?: string;
      nextPlan?: string;
      projectId?: string;
      workDate?: string;
      githubRepoUrls?: string[];
      githubUsername?: string;
      githubBranch?: string;
    };
    try {
      body = await request.json();
    } catch {
      return jsonError(400, { error: "Invalid JSON body." });
    }

    form = new FormData();
    if (body.summary) form.set("summary", String(body.summary));
    if (body.accomplishments) form.set("accomplishments", String(body.accomplishments));
    if (body.blockers !== undefined) form.set("blockers", String(body.blockers ?? ""));
    if (body.nextPlan !== undefined) form.set("nextPlan", String(body.nextPlan ?? ""));
    if (body.projectId !== undefined) form.set("projectId", String(body.projectId ?? ""));
    if (body.workDate) form.set("workDate", String(body.workDate));
    for (const url of body.githubRepoUrls ?? []) form.append("githubRepoUrl", String(url));
    if (body.githubUsername !== undefined) form.set("githubUsername", String(body.githubUsername ?? ""));
    if (body.githubBranch !== undefined) form.set("githubBranch", String(body.githubBranch ?? ""));
  }

  const result = await submitDailyUpdate({} as Parameters<typeof submitDailyUpdate>[0], form);
  if (result.error) return jsonError(400, { error: result.error });
  return jsonOk({ ok: true, success: result.success ?? "Daily update saved." });
}

