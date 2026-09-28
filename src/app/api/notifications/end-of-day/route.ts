import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { createEndOfDayReminderForUser } from "@/features/notifications/service";
import { formatIndiaTimeKey } from "@/shared/lib/india-time";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "EMPLOYEE") return new NextResponse("Unauthorized", { status: 401 });
  if (formatIndiaTimeKey() < "18:00") return NextResponse.json({ reminder: null });
  const reminder = await createEndOfDayReminderForUser(session.user.id);
  return NextResponse.json({ reminder });
}
