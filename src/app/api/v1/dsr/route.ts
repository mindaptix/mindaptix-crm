import { jsonError, jsonOk, requireSession } from "@/app/api/v1/_lib/http";
import { submitDailyUpdate } from "@/features/dashboard/actions/dsr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireSession();

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

  const form = new FormData();
  if (body.summary) form.set("summary", String(body.summary));
  if (body.accomplishments) form.set("accomplishments", String(body.accomplishments));
  if (body.blockers !== undefined) form.set("blockers", String(body.blockers ?? ""));
  if (body.nextPlan !== undefined) form.set("nextPlan", String(body.nextPlan ?? ""));
  if (body.projectId !== undefined) form.set("projectId", String(body.projectId ?? ""));
  if (body.workDate) form.set("workDate", String(body.workDate));
  for (const url of body.githubRepoUrls ?? []) form.append("githubRepoUrl", String(url));
  if (body.githubUsername !== undefined) form.set("githubUsername", String(body.githubUsername ?? ""));
  if (body.githubBranch !== undefined) form.set("githubBranch", String(body.githubBranch ?? ""));

  const result = await submitDailyUpdate({} as Parameters<typeof submitDailyUpdate>[0], form);
  if (result.error) return jsonError(400, { error: result.error });
  return jsonOk({ ok: true, success: result.success ?? "Daily update saved." });
}

