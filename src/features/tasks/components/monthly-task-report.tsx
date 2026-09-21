import { formatTaskDeadline } from "../deadline";

type ReportTask = {
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
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900">Monthly task deadlines</h3>
      <p className={`mt-1 text-sm ${missed ? "text-red-700" : "text-slate-500"}`}>
        {tasks.length} tasks · {missed} missed deadlines. Late completions remain counted.
      </p>
      <div className="mt-4 space-y-3">
        {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks due this month.</p>}
        {tasks.map((task) => (
          <article key={task.id} className={`rounded-md border p-3 ${task.deadlineMissed ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
            <p className="break-words font-medium text-slate-900">{task.title}</p>
            <p className="mt-1 text-xs text-slate-500">Due: {task.deadlineAt ? formatTaskDeadline(task.deadlineAt) : task.dueDate}</p>
            <p className="mt-2 text-xs font-semibold text-slate-600">{task.priority} · {task.status.replaceAll("_", " ")}</p>
            {task.deadlineMissed && <p className="mt-1 text-sm font-semibold text-red-700">Deadline missed</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
