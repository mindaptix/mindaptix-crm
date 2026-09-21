import type { ProviderAssessment, ReviewProvider } from "./types";

export function parseGithubRepository(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash) return null;
    const match = url.pathname.match(/^\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
    if (!match) return null;
    const repo = match[2].replace(/\.git$/, "");
    if (!repo || repo === "." || repo === "..") return null;
    return { owner: match[1], repo, fullName: `${match[1]}/${repo}`, url: `https://github.com/${match[1]}/${repo}` };
  } catch { return null; }
}

export function validGithubUsername(value: string) {
  return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value) && !value.includes("--");
}
export function validGithubBranch(value: string) {
  return value === "" || (value.length <= 160 && /^[a-zA-Z0-9_./-]+$/.test(value) && !value.includes("..") && !value.startsWith("-") && !value.endsWith("/"));
}
export function workDateWindow(workDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) throw new Error("Invalid work date.");
  const calendar = new Date(`${workDate}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== workDate) throw new Error("Invalid work date.");
  const start = new Date(`${workDate}T00:00:00+05:30`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI response was not a valid assessment.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || value.length > max) throw new Error("AI response contained invalid text.");
  return value;
}

export function validateAssessment(value: unknown, provider: ReviewProvider, model: string, allowedShas: string[]): ProviderAssessment {
  const row = record(value);
  if (row.score !== null && (typeof row.score !== "number" || !Number.isInteger(row.score) || row.score < 0 || row.score > 100)) throw new Error("AI returned an invalid score.");
  if (!["supported", "partial", "insufficient_evidence"].includes(String(row.coverage))) throw new Error("AI returned invalid coverage.");
  if (!Array.isArray(row.claims) || row.claims.length > 15 || !Array.isArray(row.limitations) || row.limitations.length > 12) throw new Error("AI assessment exceeded limits.");
  const claims = row.claims.map((item) => {
    const claim = record(item);
    if (!["supported", "partial", "not_evidenced"].includes(String(claim.assessment)) || !Array.isArray(claim.commitShas) || claim.commitShas.length > 20 || claim.commitShas.some((sha) => typeof sha !== "string" || !allowedShas.includes(sha))) throw new Error("AI cited a commit outside the fetched evidence.");
    if (claim.assessment !== "not_evidenced" && claim.commitShas.length === 0) throw new Error("AI supported a claim without a commit citation.");
    return { claim: text(claim.claim, 500), assessment: claim.assessment as "supported" | "partial" | "not_evidenced", commitShas: claim.commitShas as string[], evidence: text(claim.evidence, 1000) };
  });
  return { provider, model, score: row.coverage === "insufficient_evidence" ? null : row.score as number | null, coverage: row.coverage as ProviderAssessment["coverage"], summary: text(row.summary, 1500), claims, limitations: row.limitations.map((item) => text(item, 500)) };
}
