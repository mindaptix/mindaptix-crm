import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  await connectDb();
  const date = formatIndiaDateKey();
  const attendance = await AttendanceModel.findOne({
    userId: session.user.id,
    dateKey: date,
  }).lean();

  return NextResponse.json({
    attendance: attendance
      ? {
          id: attendance._id.toString(),
          date: attendance.dateKey,
          status: attendance.status,
          workMode: attendance.workMode,
          checkInAt: attendance.checkInAt.toISOString(),
          checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
          workedMinutes: attendance.workedMinutes ?? 0,
          isLate: attendance.isLate ?? false,
          lateByMinutes: attendance.lateByMinutes ?? 0,
        }
      : null,
  });
}
