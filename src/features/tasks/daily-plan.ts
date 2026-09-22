export type DailyPlan = { assignedCount: number; selfCount: number; ready: boolean; date: string };

export function dailyPlanFilter(userId: string, today: string) {
  return { assignedUserId: userId, $or: [
    { workDate: today },
    { workDate: { $in: [null, ""] }, dueDate: today },
  ] };
}

export function summarizeDailyPlan(rows: { assignedByUserId: string; title: string }[], userId: string, date: string): DailyPlan {
  const assignedCount = rows.filter((task) => task.assignedByUserId !== userId).length;
  const selfCount = new Set(rows.filter((task) => task.assignedByUserId === userId).map((task) => task.title.trim().toLowerCase())).size;
  return { assignedCount, selfCount, ready: assignedCount > 0 || selfCount >= 2, date };
}
