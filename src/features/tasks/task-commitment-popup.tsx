"use client";

import { useEffect, useState, useTransition } from "react";
import { pendingCommitmentTasks, saveTaskCommitment } from "@/features/tasks/commitment-actions";

type Task = { id: string; title: string; dueDate: string };

export function TaskCommitmentPopup() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today, setToday] = useState("");
  const [friday, setFriday] = useState("");
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    pendingCommitmentTasks().then((result) => {
      if (!alive || !result.tasks.length) return;
      setTasks(result.tasks); setToday(result.today); setFriday(result.friday); setDate(result.today); setOpen(true);
    }).catch(() => { /* Attendance remains recorded if the optional prompt cannot load. */ });
    return () => { alive = false; };
  }, []);

  if (!open || !tasks.length) return null;
  const task = tasks[0];
  function respond(answer: "YES" | "NO", promisedDate = "") {
    setError("");
    startTransition(async () => {
      try {
        const result = await saveTaskCommitment(task.id, answer, promisedDate);
        if (result.error) { setError(result.error); return; }
        setTasks((previous) => previous.slice(1)); setDate(today);
      } catch { setError("Could not save your response. Please try again."); }
    });
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="commitment-title">
    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Pending task · {tasks.length} remaining</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900" id="commitment-title">When can you complete this task?</h2>
      <p className="mt-4 font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-sm text-slate-500">Task due date: {task.dueDate || "Not set"}</p>
      <p className="mt-3 text-sm text-slate-600">If you confirm today or another date this week and the task is still incomplete at the end of Friday {friday}, ₹200 will be deducted once for this task. Choosing No or closing this prompt is not a commitment.</p>
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={pending} onClick={() => respond("YES", today)} type="button">Yes, today</button>
        <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50" disabled={pending} onClick={() => respond("NO")} type="button">No</button>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-700">Or choose a date this week<input className="mt-1 block rounded-md border border-slate-300 px-3 py-2" type="date" min={today} max={friday} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <button className="rounded-md border border-violet-300 px-4 py-2 text-sm text-violet-700 disabled:opacity-50" disabled={pending || !date} onClick={() => respond("YES", date)} type="button">Confirm date</button>
      </div>
      <button className="mt-5 text-sm text-slate-500 underline" disabled={pending} onClick={() => setOpen(false)} type="button">Not now</button>
    </div>
  </div>;
}
