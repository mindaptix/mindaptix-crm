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
import { COMPANY_HOLIDAYS_2026, COMPANY_WORK_POLICY, mergeCompanyHolidays } from "@/features/dashboard/lib/work-calendar";

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

export type PendingTaskReminder = {
  title: string;
  message: string;
  sourceKey: string;
};

const AUTO_CHECKOUT_TIME = "22:00";
const MISSED_CHECKOUT_PENALTY_MINUTES = 120;

/**
 * At 10 PM IST, closes open attendance records and deducts two hours from the
 * recorded duration. The update filter makes a repeated cron invocation safe.
 */
export async function applyMissedCheckoutAdjustment(date = formatIndiaDateKey(), now = new Date()) {
  await connectDb();

  if (formatIndiaTimeKey(now) < AUTO_CHECKOUT_TIME) {
    return { adjusted: 0, reason: "Auto checkout runs after 10:00 PM IST." };
  }

  const cutoffAt = new Date(`${date}T${AUTO_CHECKOUT_TIME}:00+05:30`);
  const openRecords = await AttendanceModel.find(
    { dateKey: date, status: "PRESENT", checkInAt: { $ne: null }, checkOutAt: null },
    { _id: 1, userId: 1, checkInAt: 1 },
  ).lean();

  let adjusted = 0;
  await Promise.all(openRecords.map(async (record) => {
    const rawWorkedMinutes = Math.max(0, Math.round((cutoffAt.getTime() - new Date(record.checkInAt).getTime()) / 60_000));
    const workedMinutes = Math.max(0, rawWorkedMinutes - MISSED_CHECKOUT_PENALTY_MINUTES);
    const result = await AttendanceModel.updateOne(
      { _id: record._id, status: "PRESENT", checkOutAt: null },
      {
        $set: {
          checkOutAt: cutoffAt,
          status: "COMPLETED",
          workedMinutes,
          autoCheckoutAppliedAt: now,
          autoCheckoutPenaltyMinutes: MISSED_CHECKOUT_PENALTY_MINUTES,
        },
      },
    );
    if (!result.modifiedCount) return;

    adjusted += 1;
    await createNotification({
      recipientUserId: record.userId,
      type: "AUTO_CHECKOUT",
      title: "Attendance auto-closed at 10 PM",
      message: `You did not check out on ${date}. Your attendance was auto-closed at 10:00 PM with a 2-hour adjustment. Recorded work time: ${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m.`,
      actionUrl: "/dashboard/attendance",
      sourceKey: `auto-checkout:${record.userId}:${date}`,
    });
  }));

  return { adjusted, cutoffAt: cutoffAt.toISOString(), penaltyMinutes: MISSED_CHECKOUT_PENALTY_MINUTES };
}

/** Creates one reminder per working hour while an employee still has open tasks. */
export async function createHourlyPendingTaskReminderForUser(userId: string, date = formatIndiaDateKey(), time = formatIndiaTimeKey()): Promise<PendingTaskReminder | null> {
  await connectDb();

  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const isWeeklyOff = COMPANY_WORK_POLICY.weeklyOffDays.includes(weekday as 0 | 6);
  const isConfiguredHoliday = COMPANY_HOLIDAYS_2026.some((holiday) => holiday.date === date);
  const isCustomHoliday = Boolean(await HolidayModel.exists({ date }));
  if (isWeeklyOff || isConfiguredHoliday || isCustomHoliday || time < "10:00" || time >= "19:00") return null;

  const pendingTasks = await TaskModel.find(
    { assignedUserId: userId, status: { $nin: ["COMPLETED", "CLOSED"] } },
    { _id: 1 },
  ).lean();
  if (!pendingTasks.length) return null;

  const hourKey = time.slice(0, 2);
  const reminder = {
    title: "Pending tasks need attention",
    message: `You still have ${pendingTasks.length} pending task${pendingTasks.length === 1 ? "" : "s"}. Please complete or update them as soon as possible.`,
    sourceKey: `pending-task-reminder:${userId}:${date}:${hourKey}`,
  };
  await createNotification({ recipientUserId: userId, type: "PENDING_TASK_REMINDER", title: reminder.title, message: reminder.message, actionUrl: "/dashboard/tasks", sourceKey: reminder.sourceKey });
  return reminder;
}

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
  await syncUpcomingHolidayReminderForUser(session.user.id, today);
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
    await createHourlyPendingTaskReminderForUser(session.user.id, today, currentTime);

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

/** Creates a CRM notification on each of the three days leading up to a holiday. */
async function syncUpcomingHolidayReminderForUser(userId: string, today: string) {
  const threeDaysFromNow = addDaysToDate(today, 3);
  const customHolidays = await HolidayModel.find({ date: { $gte: today, $lte: threeDaysFromNow } }, { name: 1, date: 1 }).lean();
  const upcoming = mergeCompanyHolidays(customHolidays.map((holiday) => ({ name: holiday.name, date: holiday.date })))
    .filter((holiday) => holiday.date > today && holiday.date <= threeDaysFromNow)
    .sort((left, right) => left.date.localeCompare(right.date));
  const holiday = upcoming[0];
  if (!holiday) return;

  const daysAway = Math.round((new Date(`${holiday.date}T00:00:00.000Z`).getTime() - new Date(`${today}T00:00:00.000Z`).getTime()) / 86_400_000);
  await createNotification({
    recipientUserId: userId,
    actorUserId: "system",
    type: "HOLIDAY_REMINDER",
    title: `Holiday in ${daysAway} day${daysAway === 1 ? "" : "s"}`,
    message: `${holiday.name} is on ${holiday.date}. The office will be closed.`,
    actionUrl: "/dashboard/holidays",
    sourceKey: `holiday-reminder:${holiday.date}:${today}:${userId}`,
  });
}

function formatTimeKey(value: Date | string) {
  return formatIndiaTimeKey(value);
}

function addDaysToDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
