import { NextResponse } from "next/server";
import connectDb from "@/database/mongodb/connect";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { NotificationModel } from "@/database/mongodb/models/system/notification";
import { UserModel } from "@/database/mongodb/models/user";
import { COMPANY_HOLIDAYS_2026 } from "@/features/dashboard/lib/work-calendar";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dateKey = formatIndiaDateKey(tomorrow);
  await connectDb();
  const customHoliday = await HolidayModel.findOne({ date: dateKey }).lean();
  const holiday = customHoliday ?? COMPANY_HOLIDAYS_2026.find((item) => item.date === dateKey);
  if (!holiday) return NextResponse.json({ sent: 0, reason: "No holiday tomorrow" });

  const employees = await UserModel.find({ role: { $in: ["EMPLOYEE", "SALES", "MANAGER"] }, status: "ACTIVE" }, { _id: 1, email: 1, fullName: 1 }).lean();
  const sourcePrefix = `holiday-reminder:${dateKey}`;
  const message = `${holiday.name} is tomorrow (${dateKey}). The office will be closed.`;
  await Promise.all(employees.map(async (employee) => {
    const sourceKey = `${sourcePrefix}:${employee._id.toString()}`;
    const created = await NotificationModel.updateOne(
      { sourceKey },
      { $setOnInsert: { recipientUserId: employee._id.toString(), actorUserId: "system", type: "HOLIDAY_REMINDER", title: "Holiday tomorrow", message, actionUrl: "/dashboard/holidays", sourceKey } },
      { upsert: true },
    );
    if (!created.upsertedCount || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: employee.email, subject: `Holiday tomorrow: ${holiday.name}`, text: `Hi ${employee.fullName},\n\n${message}\n\nMindaptix CRM` }),
    });
  }));
  return NextResponse.json({ sent: employees.length, holiday: holiday.name });
}
