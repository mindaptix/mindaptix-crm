"use server";

import mongoose from "mongoose";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { TaskModel } from "@/database/mongodb/models/task";
import { TaskCommitmentModel } from "@/database/mongodb/models/operations/task-commitment";
import { formatIndiaDateKey } from "@/shared/lib/india-time";
import { fridayOfWeek } from "@/features/tasks/commitment-policy";
import { revalidatePath } from "next/cache";

async function checkedInEmployee() {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "EMPLOYEE" || session.impersonator) return null;
  await connectDb();
  const today = formatIndiaDateKey();
  if (!await AttendanceModel.exists({ userId: session.user.id, dateKey: today, checkInAt: { $ne: null } })) return null;
  return { userId: session.user.id, userName: session.user.fullName, today, friday: fridayOfWeek(today) };
}

export async function pendingCommitmentTasks() {
  const actor = await checkedInEmployee();
  if (!actor) return { tasks: [], today: "", friday: "" };
  const [tasks, answers] = await Promise.all([
    TaskModel.find({ assignedUserId: actor.userId, status: { $nin: ["COMPLETED", "CLOSED"] } }, { title: 1, dueDate: 1 }).sort({ dueDate: 1, createdAt: 1 }).lean(),
    TaskCommitmentModel.find({ userId: actor.userId, $or: [{ responseDate: actor.today }, { friday: actor.friday, answer: "YES" }] }, { taskId: 1 }).lean(),
  ]);
  const answered = new Set(answers.map((entry) => entry.taskId));
  return { tasks: tasks.filter((task) => !answered.has(task._id.toString())).map((task) => ({ id: task._id.toString(), title: task.title, dueDate: task.dueDate })), today: actor.today, friday: actor.friday };
}

export async function saveTaskCommitment(taskId: string, answer: "YES" | "NO", promisedDate: string) {
  const actor = await checkedInEmployee();
  if (!actor) return { error: "Only the checked-in employee can answer." };
  if (!mongoose.isValidObjectId(taskId) || !["YES", "NO"].includes(answer)) return { error: "Invalid response." };
  const date = new Date(`${promisedDate}T00:00:00.000Z`);
  if (answer === "YES" && (!/^\d{4}-\d{2}-\d{2}$/.test(promisedDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== promisedDate || promisedDate < actor.today || promisedDate > actor.friday)) return { error: `Choose a date from today through ${actor.friday}.` };
  if (!await TaskModel.exists({ _id: taskId, assignedUserId: actor.userId, status: { $nin: ["COMPLETED", "CLOSED"] } })) return { error: "Task is no longer assigned or is already complete." };
  await TaskCommitmentModel.init();
  const saved = await TaskCommitmentModel.updateOne({ userId: actor.userId, taskId, responseDate: actor.today }, { $setOnInsert: { userId: actor.userId, taskId, responseDate: actor.today, answer, promisedDate: answer === "YES" ? promisedDate : "", friday: actor.friday } }, { upsert: true });
  if (!saved.upsertedCount) return { error: "You have already answered for this task today." };
  if (saved.upsertedCount) {
    await TaskModel.updateOne({ _id: taskId, assignedUserId: actor.userId }, { $push: { comments: { userId: actor.userId, userName: actor.userName, role: "EMPLOYEE", message: answer === "YES" ? `Attendance response: I expect to complete this task by ${promisedDate}.` : "Attendance response: I cannot commit to completing this task this week.", createdAt: new Date() } } });
    revalidatePath("/dashboard/tasks");
  }
  return { success: true };
}
