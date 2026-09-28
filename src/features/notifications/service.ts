import mongoose from "mongoose";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { NotificationModel, type NotificationType } from "@/database/mongodb/models/notification";
import { SalesLeadModel } from "@/database/mongodb/models/sales-lead";
import { SettingModel } from "@/database/mongodb/models/setting";
import { TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { COMPANY_HOLIDAYS_2026, COMPANY_WORK_POLICY } from "@/features/dashboard/lib/work-calendar";

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

export async function getUnreadAssignmentsForUser(userId: string) {
  await connectDb();

  return NotificationModel.find({
    recipientUserId: userId,
    type: { $in: ["TASK_ASSIGNED", "PROJECT_ASSIGNED"] },
    readAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
}

export async function getAdminUserIds() {
  await connectDb();

  const admins = await UserModel.find({ role: { $in: ["SUPER_ADMIN", "MANAGER"] }, status: "ACTIVE" }, { _id: 1 }).lean();
  return admins.map((admin) => admin._id.toString());
}

export type EndOfDayReminder = {
  title: string;
  message: string;
  sourceKey: string;
};

/** Creates one idempotent 6 PM reminder for an employee's unfinished due work and missing DSR. */
export async function createEndOfDayReminderForUser(userId: string, date = formatIndiaDateKey()): Promise<EndOfDayReminder | null> {
  await connectDb();

  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const isWeeklyOff = COMPANY_WORK_POLICY.weeklyOffDays.includes(weekday as 0 | 6);
  const isConfiguredHoliday = COMPANY_HOLIDAYS_2026.some((holiday) => holiday.date === date);
  const isCustomHoliday = Boolean(await HolidayModel.exists({ date }));
  if (isWeeklyOff || isConfiguredHoliday || isCustomHoliday) return null;

  const [todayDsr, unfinishedTasks] = await Promise.all([
    DailyUpdateModel.findOne({ userId, workDate: date }, { _id: 1 }).lean(),
    TaskModel.find(
      { assignedUserId: userId, dueDate: { $lte: date }, status: { $nin: ["COMPLETED", "CLOSED"] } },
      { title: 1 },
    ).sort({ dueDate: 1 }).lean(),
  ]);
  const missingDsr = !todayDsr;
  if (!missingDsr && unfinishedTasks.length === 0) return null;

  const taskPhrase = unfinishedTasks.length
    ? `${unfinishedTasks.length} task${unfinishedTasks.length === 1 ? " is" : "s are"} still incomplete`
    : "";
  const dsrPhrase = missingDsr ? "today's DSR is still pending" : "";
  const reminder: EndOfDayReminder = {
    title: "6 PM work reminder",
    message: [taskPhrase, dsrPhrase].filter(Boolean).join(" and ") + ". Please update your tasks and submit your DSR.",
    sourceKey: `end-of-day-reminder:${userId}:${date}`,
  };
  await createNotification({ recipientUserId: userId, type: "END_OF_DAY_REMINDER", title: reminder.title, message: reminder.message, actionUrl: "/dashboard", sourceKey: reminder.sourceKey });
  return reminder;
}

export async function syncWorkflowNotifications(session: AuthenticatedSession) {
  await connectDb();

  const today = formatIndiaDateKey();
  const currentTime = formatIndiaTimeKey();
  const settings = await SettingModel.findOne({ key: "company" }, { workStart: 1 }).lean();
  const workStart = settings?.workStart ?? "10:00";
  const todaysMeetings = await SalesLeadModel.find(
    { meetingDate: today },
    { salesUserId: 1, clientName: 1, meetingTime: 1 },
  ).lean();

  if (todaysMeetings.length > 0) {
    const adminRecipients = await getAdminUserIds();

    await Promise.all(
      todaysMeetings.map((meeting) =>
        createNotificationsForUsers([...adminRecipients, meeting.salesUserId], {
          type: "MEETING_REMINDER",
          title: "Client meeting today",
          message: `${meeting.clientName} meeting${meeting.meetingTime ? ` at ${meeting.meetingTime}` : ""} is scheduled today.`,
          actionUrl: "/dashboard",
          sourceKey: `meeting-reminder:${meeting._id.toString()}:${today}`,
        }),
      ),
    );
  }

  if (session.user.role === "EMPLOYEE") {
    const [todayAttendance, activeTasks] = await Promise.all([
      AttendanceModel.findOne({ userId: session.user.id, dateKey: today }, { checkInAt: 1 }).lean(),
      TaskModel.find({ assignedUserId: session.user.id, status: { $ne: "COMPLETED" } }, { title: 1, dueDate: 1 }).lean(),
    ]);

    if (currentTime >= "18:00") await createEndOfDayReminderForUser(session.user.id, today);

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
