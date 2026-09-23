import { formatTaskDeadline } from "../deadline";

type ReportTask = {
  createdAt: string;
  completedAt: string;
  id: string;
  title: string;
  deadlineAt: string;
  dueDate: string;
  status: string;
  priority: string;
  deadlineMissed: boolean;
};

export function MonthlyTaskReport({ tasks }: { tasks: ReportTask[] }) {
  const missed = tasks.filter((task) => task.deadlineMissed).length;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Task delivery</p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">Monthly task activity</h3>
        <p className={`mt-1 text-sm ${missed ? "text-red-700" : "text-slate-500"}`}>
          {tasks.length} assigned · {missed} deadline{missed === 1 ? "" : "s"} missed.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {tasks.length === 0 && <p className="px-5 py-8 text-sm text-slate-500">No tasks due this month.</p>}
        {tasks.map((task) => (
          <article key={task.id} className={`px-5 py-4 ${task.deadlineMissed ? "bg-red-50/50" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-slate-900">{task.title}</p>
                <p className="mt-1 text-xs text-slate-500">Due {task.deadlineAt ? formatTaskDeadline(task.deadlineAt) : task.dueDate}</p>
                {task.completedAt ? <p className="mt-1 text-xs text-emerald-700">Completed {formatDateTime(task.completedAt)}{task.createdAt ? ` · ${elapsed(task.createdAt, task.completedAt)}` : ""}</p> : <p className="mt-1 text-xs text-slate-400">Not completed yet</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[0.65rem] font-semibold text-slate-600">{task.priority}</span>
                <span className="rounded-md bg-indigo-50 px-2 py-1 text-[0.65rem] font-semibold text-indigo-700">{task.status.replaceAll("_", " ")}</span>
                {task.deadlineMissed ? <span className="rounded-md bg-red-100 px-2 py-1 text-[0.65rem] font-semibold text-red-700">Late</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
}

function elapsed(start: string, end: string) {
  const duration = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(duration) || duration < 0) return "";
  const hours = Math.floor(duration / 3_600_000);
  const days = Math.floor(hours / 24);
  return days ? `completed in ${days}d ${hours % 24}h` : `completed in ${Math.max(hours, 1)}h`;
}
