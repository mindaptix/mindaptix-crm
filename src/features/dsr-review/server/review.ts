import "server-only";
import { createHash, randomUUID } from "node:crypto";
import connectDb from "@/database/mongodb/connect";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { DsrAiReviewModel } from "@/database/mongodb/models/operations/dsr-ai-review";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import type { AiReviewResult, DsrReviewInput, ProviderAssessment } from "../types";
import { collectGithubEvidence } from "./github";
import { assessWithProvider, reviewConfiguration } from "./providers";
import { getAiRuntimeConfig } from "@/features/ai-settings/server/config";

export class ReviewError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function sourceHash(input: DsrReviewInput & { reviewRevision?: string }) {
  return createHash("sha256").update(JSON.stringify([input.workDate, input.summary, input.accomplishments, input.blockers ?? "", input.githubRepoUrl ?? "", input.githubUsername ?? "", input.githubBranch ?? "", input.reviewRevision ?? ""])).digest("hex");
}
async function loadDsr(session: AuthenticatedSession, id: string) {
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) throw new ReviewError("Only admins can review DSR evidence.", 403);
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ReviewError("Invalid DSR ID.");
  await connectDb();
  const dsr = await DailyUpdateModel.findById(id).lean();
  if (!dsr) throw new ReviewError("DSR not found.", 404);
  return dsr;
}
export async function getDsrReview(session: AuthenticatedSession, id: string) {
  const dsr = await loadDsr(session, id);
  const record = await DsrAiReviewModel.findById(id).lean();
  const currentHash = sourceHash(dsr);
  return {
    result: record?.sourceHash === currentHash && record.status === "ready" ? record.result as AiReviewResult : null,
    running: record?.status === "running" && record.sourceHash === currentHash && Boolean(record.startedAt && record.startedAt.getTime() > Date.now() - 180_000),
    error: record?.status === "error" && record.sourceHash === currentHash ? record.error : "",
    missingConfiguration: (await reviewConfiguration()).missing,
  };
}

export async function runDsrReview(session: AuthenticatedSession, id: string, refresh: boolean): Promise<AiReviewResult> {
  const dsr = await loadDsr(session, id);
  const hash = sourceHash(dsr);
  if (!dsr.githubRepoUrl || !dsr.githubUsername) throw new ReviewError("This DSR has no repository or GitHub username. Ask the employee to update it.");
  const missing = (await reviewConfiguration()).missing;
  if (missing.length) throw new ReviewError(`Configure ${missing.join(" and ")} on the server before running a review.`, 503);
  try { await DsrAiReviewModel.updateOne({ _id: id }, { $setOnInsert: { status: "idle" } }, { upsert: true }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  const existing = await DsrAiReviewModel.findById(id).lean();
  if (!refresh && existing?.status === "ready" && existing.sourceHash === hash && existing.result) return existing.result as AiReviewResult;
  if (existing?.finishedAt && existing.finishedAt.getTime() > Date.now() - 60_000) throw new ReviewError("Wait one minute before running another review.", 429);
  const leaseId = randomUUID();
  const startedAt = new Date();
  const locked = await DsrAiReviewModel.findOneAndUpdate({ _id: id, $and: [
    { $or: [{ status: { $ne: "running" } }, { startedAt: { $lt: new Date(Date.now() - 180_000) } }] },
    { $or: [{ finishedAt: null }, { finishedAt: { $lt: new Date(Date.now() - 60_000) } }] },
  ] }, { $set: { status: "running", sourceHash: hash, leaseId, startedAt, requestedBy: session.user.id, error: "" } }, { returnDocument: "after" }).lean();
  if (!locked) throw new ReviewError("Review is already running. Check again shortly.", 409);
  try {
    const signal = AbortSignal.timeout(150_000);
    const evidence = await collectGithubEvidence(dsr.githubRepoUrl, dsr.githubUsername, dsr.githubBranch ?? "", dsr.workDate, signal);
    const assessments: ProviderAssessment[] = [];
    const warnings = [...evidence.warnings];
    if (evidence.commits.length) {
      const aiConfig = await getAiRuntimeConfig();
      const providers = aiConfig.openai.key ? ["groq", "openai"] as const : ["groq"] as const;
      const outcomes = await Promise.allSettled(providers.map((provider) => assessWithProvider(provider, dsr, evidence, signal)));
      outcomes.forEach((outcome, index) => {
        if (outcome.status === "fulfilled") assessments.push(outcome.value);
        else warnings.push(`${providers[index]} assessment unavailable. Retry later or check the provider configuration.`);
      });
      if (!assessments.length) throw new ReviewError("Groq did not return a valid assessment. Check the API key, model access and quota, then retry.", 502);
    } else warnings.push("No attributed commits found for this author, branch and IST work date. This does not prove no work was done; no zero score was assigned.");
    if (assessments.length === 2 && assessments.every((row) => row.score !== null) && Math.abs(assessments[0].score! - assessments[1].score!) > 20) warnings.push("The two AI scores differ by more than 20 points. Admin review is needed to resolve the disagreement.");
    const result: AiReviewResult = {
      reviewedAt: new Date().toISOString(), reviewedBy: session.user.fullName, sourceHash: hash,
      status: !evidence.commits.length || evidence.limited ? "inconclusive" : assessments.length ? "complete" : "partial",
      repository: evidence.repository, branch: evidence.branch, author: evidence.author, workDate: dsr.workDate,
      commits: evidence.commits.map((commit) => ({ sha: commit.sha, url: commit.url, message: commit.message, committedAt: commit.committedAt, fileCount: commit.files.length })),
      assessments, warnings, fullDayAssessment: "Not verifiable from commits alone. Admin review required.",
    };
    const latest = await DailyUpdateModel.findById(id).lean();
    if (!latest || sourceHash(latest) !== hash) throw new ReviewError("DSR changed during review. Run a fresh review.", 409);
    const saved = await DsrAiReviewModel.updateOne({ _id: id, leaseId, sourceHash: hash }, { $set: { result, status: "ready", finishedAt: new Date() } });
    if (!saved.matchedCount) throw new ReviewError("This review was superseded by another run.", 409);
    return result;
  } catch (error) {
    const message = error instanceof ReviewError ? error.message : error instanceof Error && /^(Repository|DSR needs|Service |GitHub |Invalid work|Repository has)/.test(error.message) ? error.message : "Review failed. Check repository access and provider configuration, then retry.";
    await DsrAiReviewModel.updateOne({ _id: id, leaseId }, { $set: { status: "error", error: message, finishedAt: new Date() } });
    throw new ReviewError(message, error instanceof ReviewError ? error.status : 502);
  }
}
