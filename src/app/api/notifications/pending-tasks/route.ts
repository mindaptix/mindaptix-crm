import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { createHourlyPendingTaskReminderForUser } from "@/features/notifications/service";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "EMPLOYEE") return new NextResponse("Unauthorized", { status: 401 });
  const reminder = await createHourlyPendingTaskReminderForUser(session.user.id);
  return NextResponse.json({ reminder });
}
