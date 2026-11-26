import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { checkOutAttendance } from "@/features/dashboard/actions/attendance";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    lat?: unknown;
    latitude?: unknown;
    lng?: unknown;
    longitude?: unknown;
    accuracy?: unknown;
    pendingTaskReason?: unknown;
  } | null;

  const lat = body?.lat ?? body?.latitude;
  const lng = body?.lng ?? body?.longitude;

  const formData = new FormData();
  if (lat !== undefined && lat !== null) formData.append("lat", String(lat));
  if (lng !== undefined && lng !== null) formData.append("lng", String(lng));
  if (body?.accuracy !== undefined && body?.accuracy !== null) formData.append("accuracy", String(body.accuracy));
  if (body?.pendingTaskReason) formData.append("pendingTaskReason", String(body.pendingTaskReason));

  const result = await checkOutAttendance(formData);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await connectDb();
  const attendance = await AttendanceModel.findOne({
    userId: session.user.id,
    dateKey: formatIndiaDateKey(),
  }).lean();

  return NextResponse.json({
    ok: true,
    status: attendance?.status ?? "COMPLETED",
    date: attendance?.dateKey ?? formatIndiaDateKey(),
    checkOutAt: attendance?.checkOutAt?.toISOString() ?? null,
    workedMinutes: attendance?.workedMinutes ?? 0,
  });
}
