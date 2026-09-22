"use client";

import { useEffect, useState } from "react";
import type { AiReviewResult } from "../types";

type ReviewState = { result: AiReviewResult | null; running: boolean; error: string; missingConfiguration: string[] };
const EMPTY: ReviewState = { result: null, running: false, error: "", missingConfiguration: [] };

export function DsrAiReview({ dsrId, githubRepoUrl, githubUsername, githubBranch }: { dsrId: string; githubRepoUrl: string; githubUsername: string; githubBranch: string }) {
  const [state, setState] = useState<ReviewState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [requestError, setRequestError] = useState("");
  const endpoint = `/api/dsr/${encodeURIComponent(dsrId)}/review`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load AI review.");
      setState(data);
      setRequestError("");
    }).catch((error) => { if (!controller.signal.aborted) setRequestError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  useEffect(() => {
    if (!state.running || submitting) return;
    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not reload the review.");
        setState(data);
      } catch { if (!controller.signal.aborted) { setState((previous) => ({ ...previous, running: false })); setRequestError("Could not reload the review. Close and reopen this DSR."); } }
    }, 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [state.running, submitting, endpoint]);

  async function run() {
    setSubmitting(true);
    setRequestError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmAuthor: confirmed, refresh: Boolean(state.result) }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) setState((previous) => ({ ...previous, running: true }));
        throw new Error(data.error || "Review failed.");
      }
      setState({ result: data.result, running: false, error: "", missingConfiguration: [] });
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Review failed. Try again."); }
    finally { setSubmitting(false); }
  }
  const busy = submitting || state.running;
  const result = state.result;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="font-semibold text-slate-900">AI evidence review</h4>
      <p className="mt-1 text-sm text-slate-600">Groq and OpenAI independently compare this DSR with GitHub changes on the same work date (IST).</p>
      <p className="mt-2 break-all text-xs text-slate-500">{githubRepoUrl || "Repository not supplied"} · Author: {githubUsername || "Not supplied"} · Branch: {githubBranch || "Repository default"}</p>
      {!githubRepoUrl || !githubUsername ? <p className="mt-3 text-sm text-amber-800">Ask the employee to update this DSR with a repository and GitHub username.</p> : (
        <>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-blue-700" />
            <span>I have checked that this GitHub account belongs to this employee.</span>
          </label>
          <p className="mt-2 text-xs text-slate-500">Running a review sends DSR text and bounded commit diffs to both configured providers. Results are advisory; review non-code work separately.</p>
          <button type="button" disabled={loading || busy || !confirmed || state.missingConfiguration.length > 0} onClick={run} className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Loading review…" : busy ? "Reviewing commits…" : result ? "Run fresh AI review" : "Run AI review"}
          </button>
        </>
      )}
      {state.missingConfiguration.length > 0 && <p className="mt-3 text-sm text-amber-800">Server setup needed: {state.missingConfiguration.join(", ")}. Add keys through server environment settings, never in this form.</p>}
      {(requestError || state.error) && <p role="alert" className="mt-3 text-sm text-red-700">{requestError || state.error}</p>}
      {result && (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">{result.status.toUpperCase()} · {result.commits.length} inspected commits · Reviewed by {result.reviewedBy} · {new Date(result.reviewedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {result.assessments.map((assessment) => (
              <article key={assessment.provider} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold uppercase text-slate-700">{assessment.provider}</p>
                <p className="mt-1 text-2xl font-semibold text-blue-800">{assessment.score === null ? "Insufficient evidence" : `${assessment.score}/100`}</p>
                <p className="text-xs text-slate-500">DSR-to-code match · {assessment.model}</p>
                <p className="mt-3 text-sm text-slate-700">{assessment.summary}</p>
                <ul className="mt-3 space-y-3">
                  {assessment.claims.map((claim, index) => (
                    <li key={index} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-medium text-slate-900">{claim.claim}</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{claim.assessment.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-slate-600">{claim.evidence}</p>
                      <div className="mt-2 flex flex-wrap gap-2">{claim.commitShas.map((sha) => {
                        const commit = result.commits.find((item) => item.sha === sha);
                        return commit ? <a key={sha} href={commit.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-700 underline">{sha.slice(0, 7)}</a> : null;
                      })}</div>
                    </li>
                  ))}
                </ul>
                {assessment.limitations.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-amber-800">{assessment.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>}
              </article>
            ))}
          </div>
          {result.warnings.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800">{result.warnings.map((item, index) => <li key={index}>{item}</li>)}</ul>}
          <details className="text-sm text-slate-700">
            <summary className="cursor-pointer font-medium">Inspected commits</summary>
            <ul className="mt-2 space-y-2">{result.commits.map((commit) => <li key={commit.sha}><a href={commit.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{commit.sha.slice(0, 7)}</a> · {commit.message.split("\n")[0]} · {commit.fileCount} inspected files</li>)}</ul>
          </details>
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"><strong>Full-day effort:</strong> {result.fullDayAssessment}</p>
        </div>
      )}
    </section>
  );
}
