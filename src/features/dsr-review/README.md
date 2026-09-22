# DSR AI evidence review

Employees submit a GitHub repository URL, their GitHub username and an optional branch with each code DSR. For non-code work, they must upload at least one screenshot instead. Screenshot-only DSRs remain available for manual admin review; GitHub evidence is required for commit verification. The author account is self-reported, so the admin must confirm its attribution before running a review.

In **DSR → employee report → AI evidence review**, an admin or super admin can run or refresh the assessment. Groq evaluates bounded GitHub evidence and produces an evidence-alignment score with claim-by-claim commit citations. OpenAI can be configured as an optional second reviewer. Scores are advisory, are not used for payroll or disciplinary automation, and do not measure hours worked. The UI explicitly states that a full day of effort cannot be established from commits alone.

## Server configuration

Copy the DSR settings from the root `.env.example` into the deployment environment or an ignored `.env.local` file:

- `GROQ_API_KEY`
- `OPENAI_API_KEY` (optional second reviewer)
- `GROQ_DSR_MODEL` (default `openai/gpt-oss-120b`)
- `OPENAI_DSR_MODEL` (default `gpt-4o-mini`)
- `DSR_GITHUB_ALLOWED_REPOS`: comma-separated `owner/repository` names approved to share bounded diffs with Groq. Exact matching; no wildcard.
- `GITHUB_TOKEN`: optional for public repositories; required for private ones. Prefer a fine-grained GitHub token restricted to approved repositories with Contents read permission.

Keys are server-only. Never put them into `NEXT_PUBLIC_*`, client forms, commits or logs. Restart the app after configuring environment values. The feature fails clearly when credentials, model access or repository permissions are missing. It does not silently invent a score or bypass failed access checks.

## Evidence and limits

The work-date window is midnight-to-midnight IST, converted to UTC. The selected branch (or repository default branch) is queried with the employee's GitHub author filter. Returned commits are additionally checked for exact GitHub author login and committer timestamp within the half-open IST day window. This does not prove the actual time of work; author identities and commit dates are not an attendance record. Other branches, unpushed work, meetings, testing and research may be absent from the evidence.

Requests use only fixed GitHub and provider API hosts, reject redirects and enforce byte/time limits. A run has a 150-second budget and a route maximum of 180 seconds; deployments must support this duration. Commit fetching is capped at three 100-item pages and twenty detailed commits. Each commit uses at most twenty-five files, each patch at most 4,000 characters, and total patches at most 48,000 characters. Common secret/config/key files, lockfiles, maps and minified assets are excluded. This filter is not a full secret scanner; approved repositories must be suitable for sharing with the configured providers. Missing or truncated evidence is flagged and scores are withheld.

Provider requests contain DSR summary/accomplishments/blockers and bounded commit evidence, not employee emails, attachments, or provider credentials. All report text and repository content is treated as untrusted data by the review prompt. Providers have no tools. Structured outputs are validated again on the server; invented commit citations, invalid scores and incomplete responses are rejected. OpenAI Responses uses `store: false`.

No commits yields **inconclusive**, not zero. A single provider failure yields **partial** with the surviving assessment explicitly labelled. Both failures show a retryable error. Scores differing by more than twenty points produce a disagreement notice. No automatic average or full-day verdict is generated.

## Persistence and concurrency

`DailyUpdate` stores repo metadata and a new `reviewRevision` on every submission. `DsrAiReview` stores one latest result per DSR, including a hash of the evaluated revision, provider models, reviewer, timestamp and commit links; raw diffs are not persisted. Results from another revision are hidden. Reviews use a database lease, a three-minute recovery timeout and a one-minute cooldown. A revision check rejects results from a DSR edited while a review was running. Partial results can be refreshed manually.

## Files

- `validation.ts`: repository/identity/date validation and provider-output validation.
- `server/github.ts`: bounded GitHub evidence collector.
- `server/providers.ts`: Groq Chat Completions and OpenAI Responses adapters.
- `server/review.ts`: authorization, caching, leases and orchestration.
- `components/dsr-ai-review.tsx`: admin controls and evidence display.
- `app/api/dsr/[dsrId]/review/route.ts`: authenticated GET and POST endpoints.

## Validation

```sh
node --experimental-strip-types --test src/features/dsr-review/tests/review.test.mjs
```

Tests mock external services and MongoDB boundaries. Live provider quality, model availability and private-repo access need configured credentials and an approved test repository.

## API references

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Groq structured outputs](https://console.groq.com/docs/structured-outputs)
- [GitHub commit endpoints](https://docs.github.com/en/rest/commits/commits)
