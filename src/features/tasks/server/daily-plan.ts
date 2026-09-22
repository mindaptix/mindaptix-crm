import "server-only";
import { TaskModel } from "@/database/mongodb/models/task";
import { dailyPlanFilter, summarizeDailyPlan } from "../daily-plan";

export async function getDailyPlan(userId: string, today: string) {
  const tasks = await TaskModel.find(dailyPlanFilter(userId, today), { title: 1, assignedByUserId: 1 }).lean();
  return summarizeDailyPlan(tasks, userId, today);
}
