"use client";

import { useActionState, useState, type ReactNode } from "react";
import { reviewRewardClaim, submitRewardClaim } from "@/features/dashboard/actions/reward-claims";
import type { EarnMorePageData, RewardClaimEntry } from "@/features/dashboard/types";

const RULES = [
  { type: "CLIENT_FEEDBACK", amount: 200, title: "Client positive feedback", detail: "Upload a screenshot of the client's positive feedback." },
  { type: "CANDIDATE_REFERRAL", amount: 1000, title: "Successful candidate referral", detail: "Upload proof once your referred candidate is selected." },
  { type: "PUBLIC_REVIEW", amount: 500, title: "Google Maps or Upwork review", detail: "Upload the client's positive Google Maps or Jyoti Ma'am's Upwork review." },
] as const;

const INITIAL = { error: undefined, success: undefined };

export function EarnMorePanel({ data }: { data: EarnMorePageData }) {
  const [submitState, submitAction, submitting] = useActionState(submitRewardClaim, INITIAL);
  const [reviewState, reviewAction, reviewing] = useActionState(reviewRewardClaim, INITIAL);
  const [selectedRule, setSelectedRule] = useState<(typeof RULES)[number]["type"]>("CLIENT_FEEDBACK");

  return <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="bg-[linear-gradient(135deg,#ecfdf5_0%,#f0fdf4_48%,#eff6ff_100%)] px-5 py-6 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Rewards program</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Earn More</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Submit proof for extra contributions. Approved rewards are added to your salary for the claim month.</p>
      </div>
      <div className="grid gap-px bg-emerald-100 sm:grid-cols-3">
        <Metric label={data.canReview ? "Awaiting review" : "My pending claims"} value={String(data.pendingCount)} />
        <Metric label="Approved this month" value={`₹${data.approvedThisMonth.toLocaleString("en-IN")}`} />
        <Metric label="Approval" value="Super Admin" />
      </div>
    </section>

    {!data.canReview ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Submit a reward claim</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950">Choose how you contributed</h2>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {RULES.map((rule) => <button className={`rounded-xl border p-4 text-left transition ${selectedRule === rule.type ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"}`} key={rule.type} onClick={() => setSelectedRule(rule.type)} type="button"><p className="text-lg font-semibold text-emerald-700">₹{rule.amount}</p><p className="mt-2 text-sm font-semibold text-slate-900">{rule.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{rule.detail}</p></button>)}
      </div>
      <form action={submitAction} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        {submitState.error ? <Feedback tone="error">{submitState.error}</Feedback> : null}
        {submitState.success ? <Feedback tone="success">{submitState.success}</Feedback> : null}
        <input name="type" type="hidden" value={selectedRule} />
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Short title</span><input className={INPUT} name="title" placeholder="e.g. Positive feedback from Galaxy client" required /></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Details</span><textarea className={`${INPUT} min-h-24 resize-y`} name="details" placeholder="Add client name, source, and why this reward applies." required minLength={10} /></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Proof screenshot</span><input accept="image/png,image/jpeg,image/webp" className="block w-full rounded-lg border border-dashed border-emerald-300 bg-white px-3 py-3 text-sm text-slate-600" name="proof" required type="file" /><span className="mt-1 block text-xs text-slate-500">PNG, JPG, or WebP · maximum 5 MB</span></label>
        <button className="w-fit rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50" disabled={submitting} type="submit">{submitting ? "Submitting…" : "Submit for approval"}</button>
      </form>
    </section> : null}

    {(reviewState.error || reviewState.success) ? <Feedback tone={reviewState.error ? "error" : "success"}>{reviewState.error ?? reviewState.success}</Feedback> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{data.canReview ? "Review queue and history" : "My reward history"}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{data.canReview ? "Reward claims" : "Submitted claims"}</h2></div>
      {data.claims.length ? <div className="divide-y divide-slate-100">{data.claims.map((claim) => <ClaimRow claim={claim} canReview={data.canReview} reviewAction={reviewAction} reviewing={reviewing} key={claim.id} />)}</div> : <p className="px-6 py-14 text-center text-sm text-slate-500">No reward claims yet.</p>}
    </section>
  </div>;
}

function ClaimRow({ claim, canReview, reviewAction, reviewing }: { claim: RewardClaimEntry; canReview: boolean; reviewAction: (formData: FormData) => void; reviewing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Status status={claim.status} /><span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">₹{claim.amount.toLocaleString("en-IN")}</span><span className="text-xs text-slate-400">{claim.rewardMonthKey}</span></div><h3 className="mt-2 font-semibold text-slate-900">{claim.title}</h3>{canReview ? <p className="mt-1 text-sm text-slate-500">Submitted by {claim.employeeName}</p> : null}<p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{claim.details}</p>{claim.reviewNote ? <p className="mt-2 text-xs text-slate-500">Review note: {claim.reviewNote}</p> : null}</div><a className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50" href={claim.proofUrl} rel="noreferrer" target="_blank">View proof ↗</a></div>{canReview && claim.status === "PENDING" ? <div className="mt-4 border-t border-slate-100 pt-4"><button className="text-sm font-semibold text-indigo-700" onClick={() => setExpanded(!expanded)} type="button">{expanded ? "Cancel review" : "Review claim"}</button>{expanded ? <form action={reviewAction} className="mt-3 flex flex-wrap items-end gap-3"><input name="claimId" type="hidden" value={claim.id} /><label className="min-w-60 flex-1"><span className="mb-1 block text-xs font-medium text-slate-600">Review note (optional)</span><input className={INPUT} name="reviewNote" placeholder="Add a note for the employee" /></label><button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={reviewing} name="action" type="submit" value="APPROVED">Approve ₹{claim.amount}</button><button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50" disabled={reviewing} name="action" type="submit" value="REJECTED">Reject</button></form> : null}</div> : null}</article>;
}

const INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-white px-5 py-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div>; }
function Status({ status }: { status: RewardClaimEntry["status"] }) { const style = status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"; return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${style}`}>{status[0] + status.slice(1).toLowerCase()}</span>; }
function Feedback({ children, tone }: { children: ReactNode; tone: "error" | "success" }) { return <p className={`rounded-lg border px-3 py-2 text-sm ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</p>; }
