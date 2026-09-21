export type ReviewProvider = "groq" | "openai";
export type ClaimAssessment = {
  claim: string;
  assessment: "supported" | "partial" | "not_evidenced";
  commitShas: string[];
  evidence: string;
};
export type ProviderAssessment = {
  provider: ReviewProvider;
  model: string;
  score: number | null;
  coverage: "supported" | "partial" | "insufficient_evidence";
  summary: string;
  claims: ClaimAssessment[];
  limitations: string[];
};
export type CommitEvidence = {
  sha: string;
  url: string;
  message: string;
  committedAt: string;
  files: { filename: string; additions: number; deletions: number; patch: string }[];
};
export type GithubEvidence = {
  repository: string;
  branch: string;
  author: string;
  workDate: string;
  commits: CommitEvidence[];
  limited: boolean;
  warnings: string[];
};
export type AiReviewResult = {
  reviewedAt: string;
  reviewedBy: string;
  sourceHash: string;
  status: "complete" | "partial" | "inconclusive";
  repository: string;
  branch: string;
  author: string;
  workDate: string;
  commits: { sha: string; url: string; message: string; committedAt: string; fileCount: number }[];
  assessments: ProviderAssessment[];
  warnings: string[];
  fullDayAssessment: "Not verifiable from commits alone. Admin review required.";
};
export type DsrReviewInput = {
  workDate: string;
  summary: string;
  accomplishments: string;
  blockers?: string;
  githubRepoUrl?: string;
  githubUsername?: string;
  githubBranch?: string;
};
