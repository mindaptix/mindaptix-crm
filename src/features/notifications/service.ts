import mongoose from "mongoose";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { NotificationModel, type NotificationType } from "@/database/mongodb/models/notification";
import { SettingModel } from "@/database/mongodb/models/setting";
import { TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";

type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  sourceKey?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  await connectDb();

  const sourceKey =
    input.sourceKey ??
    `${input.type}:${input.recipientUserId}:${new mongoose.Types.ObjectId().toString()}`;

  await NotificationModel.findOneAndUpdate(
    { sourceKey },
    {
      $setOnInsert: {
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? "",
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl ?? "",
        sourceKey,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
}

export async function createNotificationsForUsers(userIds: string[], input: Omit<CreateNotificationInput, "recipientUserId">) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  await Promise.all(
    uniqueUserIds.map((recipientUserId) =>
      createNotification({
        ...input,
        recipientUserId,
        sourceKey: input.sourceKey ? `${input.sourceKey}:${recipientUserId}` : undefined,
      }),
    ),
  );
}

export async function getNotificationsForUser(userId: string, limit = 8) {
  await connectDb();

  return NotificationModel.find({ recipientUserId: userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function getAdminUserIds() {
  await connectDb();

  const admins = await UserModel.find({ role: "MANAGER", status: "ACTIVE" }, { _id: 1 }).lean();
  return admins.map((admin) => admin._id.toString());
}

export async function syncWorkflowNotifications(session: AuthenticatedSession) {
  await connectDb();

  const today = formatIndiaDateKey();
  const currentTime = formatIndiaTimeKey();
  const settings = await SettingModel.findOne({ key: "company" }, { workStart: 1 }).lean();
  const workStart = settings?.workStart ?? "09:00";

  if (session.user.role === "EMPLOYEE") {
    const [todayUpdate, todayAttendance, activeTasks] = await Promise.all([
      DailyUpdateModel.findOne({ userId: session.user.id, workDate: today }, { _id: 1 }).lean(),
      AttendanceModel.findOne({ userId: session.user.id, dateKey: today }, { checkInAt: 1 }).lean(),
      TaskModel.find({ assignedUserId: session.user.id, status: { $ne: "COMPLETED" } }, { title: 1, dueDate: 1 }).lean(),
    ]);

    // Remind between 18:30 and 19:00 IST if DSR not submitted
    if (!todayUpdate && currentTime >= "18:30" && currentTime < "19:00") {
      await createNotification({
        recipientUserId: session.user.id,
        type: "DSR_REMINDER",
        title: "DSR pending — please submit before 7 PM",
        message: "You haven't submitted today's DSR yet. Submit it now before the day closes.",
        actionUrl: "/dashboard/dsr",
        sourceKey: `dsr-reminder:${session.user.id}:${today}`,
      });
    }

    if (todayAttendance?.checkInAt && formatTimeKey(todayAttendance.checkInAt) > workStart) {
      const managerRecipients = session.user.managerId ? [session.user.managerId] : [];
      const adminRecipients = await getAdminUserIds();
      await createNotificationsForUsers([...managerRecipients, ...adminRecipients], {
        actorUserId: session.user.id,
        type: "LATE_CHECKIN",
        title: "Late check-in alert",
        message: `${session.user.fullName} checked in at ${formatTimeKey(todayAttendance.checkInAt)}.`,
        actionUrl: "/dashboard/attendance",
        sourceKey: `late-checkin:${session.user.id}:${today}`,
      });
    }

    const reminderTasks = activeTasks.filter((task) => task.dueDate <= addDaysToDate(today, 1));

    await Promise.all(
      reminderTasks.map((task) =>
        createNotification({
          recipientUserId: session.user.id,
          type: task.dueDate < today ? "TASK_OVERDUE" : "DEADLINE_REMINDER",
          title: task.dueDate < today ? "Task is overdue" : "Task deadline is close",
          message:
            task.dueDate < today
              ? `${task.title} crossed its deadline on ${task.dueDate}.`
              : `${task.title} is due on ${task.dueDate}.`,
          actionUrl: "/dashboard/tasks",
          sourceKey: `${task.dueDate < today ? "task-overdue" : "task-deadline"}:${task._id.toString()}:${today}`,
        }),
      ),
    );
  }
}

function formatTimeKey(value: Date | string) {
  return formatIndiaTimeKey(value);
}

function addDaysToDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}


