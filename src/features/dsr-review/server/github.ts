import "server-only";
import { parseGithubRepository, validGithubUsername, validGithubBranch, workDateWindow } from "../validation";
import type { CommitEvidence, GithubEvidence } from "../types";
import { fetchJson } from "./http";

type Commit = { sha: string; author?: { login?: string } | null; commit: { message: string; committer?: { date?: string } }; files?: { filename: string; additions: number; deletions: number; patch?: string }[] };
const OMIT_FILE = /(^|\/)(\.env(?:\..*)?|[^/]*(?:secret|credential)[^/]*|(?:package|pnpm|yarn)[-.]lock[^/]*)$|\.(pem|key|p12|pfx|map)$|\.min\.(js|css)$/i;

export async function collectGithubEvidence(repoUrl: string, username: string, branch: string, workDate: string): Promise<GithubEvidence> {
  const repo = parseGithubRepository(repoUrl);
  if (!repo || !validGithubUsername(username) || !validGithubBranch(branch)) throw new Error("DSR needs a valid repository, GitHub username and branch.");
  const allowed = (process.env.DSR_GITHUB_ALLOWED_REPOS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(repo.fullName.toLowerCase())) throw new Error("Repository is not enabled for AI review. Add owner/repo to DSR_GITHUB_ALLOWED_REPOS on the server.");
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const base = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  const metadata = await fetchJson(base, { headers }) as { default_branch?: string };
  const selectedBranch = branch || metadata.default_branch;
  if (!selectedBranch) throw new Error("Repository has no default branch.");
  const window = workDateWindow(workDate);
  const query = new URLSearchParams({ sha: selectedBranch, author: username, since: window.start, until: window.end, per_page: "100" });
  const candidates: Commit[] = [];
  const warnings = [`Only branch '${selectedBranch}' was checked. Unpushed work and other branches are not included.`, "GitHub author account was supplied in the DSR and confirmed by the reviewing admin; commit timestamps and authorship are not proof of hours worked."];
  let limited = false;
  for (let page = 1; page <= 3; page++) {
    const rows = await fetchJson(`${base}/commits?${query}&page=${page}`, { headers });
    if (!Array.isArray(rows)) throw new Error("GitHub returned an invalid commit list.");
    candidates.push(...rows as Commit[]);
    if (rows.length < 100) break;
    if (page === 3) { limited = true; warnings.push("Commit pagination limit reached."); }
  }
  const matching = [...new Map(candidates.filter((commit) => {
    const date = commit.commit?.committer?.date;
    return /^[a-f\d]{40}$/i.test(commit.sha) && commit.author?.login?.toLowerCase() === username.toLowerCase() && date && new Date(date) >= new Date(window.start) && new Date(date) < new Date(window.end);
  }).map((commit) => [commit.sha, commit])).values()];
  if (matching.length !== candidates.length) warnings.push("Duplicates, commits outside the IST date, or commits without matching GitHub author attribution were excluded.");
  if (matching.length > 20) { limited = true; warnings.push("Only the latest 20 matching commits were inspected."); }
  const details: Commit[] = [];
  const selected = matching.slice(0, 20);
  for (let index = 0; index < selected.length; index += 5) {
    details.push(...await Promise.all(selected.slice(index, index + 5).map(async (commit) => await fetchJson(`${base}/commits/${commit.sha}`, { headers }) as Commit)));
  }
  let remaining = 48_000;
  const commits: CommitEvidence[] = details.map((commit, index) => {
    if (commit.sha !== selected[index].sha) throw new Error("GitHub returned mismatched commit evidence.");
    const allFiles = commit.files ?? [];
    if (allFiles.length > 25) limited = true;
    const files = allFiles.slice(0, 25).filter((file) => {
      if (OMIT_FILE.test(file.filename)) { limited = true; return false; }
      return true;
    }).map((file) => {
      const original = file.patch ?? "";
      const patch = original.slice(0, Math.min(4000, remaining));
      remaining -= patch.length;
      if (!original || patch.length < original.length) limited = true;
      return { filename: file.filename.slice(0, 300), additions: file.additions, deletions: file.deletions, patch };
    });
    return { sha: commit.sha, url: `${repo.url}/commit/${commit.sha}`, message: commit.commit.message.slice(0, 1500), committedAt: commit.commit.committer?.date ?? "", files };
  });
  if (limited) warnings.push("Evidence is limited: file/diff limits, binary files or excluded sensitive/generated files. Scores are withheld when evidence is incomplete.");
  return { repository: repo.url, branch: selectedBranch, author: username, workDate, commits, limited, warnings };
}
