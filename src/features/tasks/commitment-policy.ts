export function fridayOfWeek(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (5 - day + 7) % 7);
  return date.toISOString().slice(0, 10);
}

export function fridayEndInstant(friday: string): Date {
  return new Date(new Date(`${friday}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000);
}

export function shouldDeductForCommitment(task: { status: string; completedAt?: Date | null; updatedAt?: Date | null }, cutoff: Date): boolean {
  if (task.completedAt && task.completedAt < cutoff) return false;
  if (["COMPLETED", "CLOSED"].includes(task.status)) return Boolean(task.completedAt && task.completedAt >= cutoff);
  // After a delayed cron, a later edit may have changed the earlier status.
  // Avoid a financial deduction when the Friday status cannot be established.
  return Boolean(task.updatedAt && task.updatedAt < cutoff);
}
