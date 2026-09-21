export type DeadlineTask = {
  dueDate: string;
  deadlineAt?: Date | string | null;
  deadlineMissedAt?: Date | string | null;
  completedAt?: Date | string | null;
  status: string;
};

/** Form dates and times are explicitly in India time, independent of server/browser timezone. */
export function parseTaskDeadline(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) return null;
  return new Date(`${date}T${time}:00+05:30`);
}

export function taskDeadline(task: Pick<DeadlineTask, "dueDate" | "deadlineAt">): Date | null {
  if (task.deadlineAt) {
    const date = new Date(task.deadlineAt);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  // Existing date-only tasks retain their end-of-day deadline.
  const date = parseTaskDeadline(task.dueDate, "23:59");
  return date ? new Date(date.getTime() + 59_999) : null;
}

export function isTaskFinished(status: string) {
  return status === "COMPLETED" || status === "CLOSED";
}

export function missedTaskDeadline(task: DeadlineTask, now = new Date()): boolean {
  if (task.deadlineMissedAt) return true;
  const deadline = taskDeadline(task);
  if (!deadline) return false;
  if (isTaskFinished(task.status)) {
    return Boolean(task.completedAt && new Date(task.completedAt).getTime() > deadline.getTime());
  }
  return now.getTime() > deadline.getTime();
}

export function formatTaskDeadline(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value)) + " IST";
}

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadlineAt: string;
};
