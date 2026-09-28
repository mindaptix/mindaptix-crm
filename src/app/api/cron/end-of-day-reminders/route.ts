import { NextResponse } from "next/server";
import connectDb from "@/database/mongodb/connect";
import { UserModel } from "@/database/mongodb/models/user";
import { createEndOfDayReminderForUser } from "@/features/notifications/service";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  await connectDb();
  const employees = await UserModel.find({ role: "EMPLOYEE", status: "ACTIVE" }, { _id: 1 }).lean();
  const date = formatIndiaDateKey();
  const reminders = await Promise.all(employees.map((employee) => createEndOfDayReminderForUser(employee._id.toString(), date)));
  return NextResponse.json({ date, sent: reminders.filter(Boolean).length });
}
