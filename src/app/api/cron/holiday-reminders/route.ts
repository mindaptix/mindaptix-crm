import { NextResponse } from "next/server";
import connectDb from "@/database/mongodb/connect";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { NotificationModel } from "@/database/mongodb/models/system/notification";
import { UserModel } from "@/database/mongodb/models/user";
import { mergeCompanyHolidays } from "@/features/dashboard/lib/work-calendar";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const today = formatIndiaDateKey();
  const dateKey = addDaysToDate(today, 3);
  await connectDb();
  const customHolidays = await HolidayModel.find({ date: { $gt: today, $lte: dateKey } }).lean();
  const holidays = mergeCompanyHolidays(customHolidays.map((holiday) => ({ name: holiday.name, date: holiday.date })))
    .filter((holiday) => holiday.date > today && holiday.date <= dateKey);
  if (!holidays.length) return NextResponse.json({ sent: 0, reason: "No holiday in the next 3 days" });

  const users = await UserModel.find({ status: "ACTIVE" }, { _id: 1, email: 1, fullName: 1 }).lean();
  let sent = 0;
  await Promise.all(holidays.flatMap((holiday) => {
    const daysAway = Math.round((new Date(`${holiday.date}T00:00:00.000Z`).getTime() - new Date(`${today}T00:00:00.000Z`).getTime()) / 86_400_000);
    const message = `${holiday.name} is in ${daysAway} day${daysAway === 1 ? "" : "s"} (${holiday.date}). The office will be closed.`;
    return users.map(async (user) => {
      const sourceKey = `holiday-reminder:${holiday.date}:${today}:${user._id.toString()}`;
      const created = await NotificationModel.updateOne(
        { sourceKey },
        { $setOnInsert: { recipientUserId: user._id.toString(), actorUserId: "system", type: "HOLIDAY_REMINDER", title: `Holiday in ${daysAway} day${daysAway === 1 ? "" : "s"}`, message, actionUrl: "/dashboard/holidays", sourceKey } },
        { upsert: true },
      );
      if (!created.upsertedCount) return;
      sent += 1;
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: user.email, subject: `Upcoming holiday: ${holiday.name}`, text: `Hi ${user.fullName},\n\n${message}\n\nMindaptix CRM` }) });
    });
  }));
  return NextResponse.json({ sent, holidays: holidays.map((holiday) => holiday.name) });
}

function addDaysToDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
