"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { SettingModel } from "@/database/mongodb/models/setting";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";

const VALID_WORK_MODES = ["OFFICE", "WFH", "FIELD"] as const;
type WorkMode = (typeof VALID_WORK_MODES)[number];

type CompanySettings = {
  workStart?: string;
  lateGraceMinutes?: number;
};

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export async function checkInAttendance(formData: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  const rawMode = String(formData.get("workMode") ?? "OFFICE");
  const workMode: WorkMode = VALID_WORK_MODES.includes(rawMode as WorkMode) ? (rawMode as WorkMode) : "OFFICE";

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);
  const currentTimeKey = formatIndiaTimeKey(now);

  const settings = await SettingModel.findOne({ key: "company" }).lean();
  const companySettings = (settings ?? {}) as unknown as Partial<CompanySettings>;
  const workStart: string = companySettings.workStart ?? "09:00";
  const lateGraceMinutes: number = Number(companySettings.lateGraceMinutes ?? 15);

  const currentMinutes = parseTimeToMinutes(currentTimeKey);
  const graceDeadlineMinutes = parseTimeToMinutes(workStart) + lateGraceMinutes;
  const isLate = currentMinutes > graceDeadlineMinutes;
  const lateByMinutes = isLate ? currentMinutes - parseTimeToMinutes(workStart) : 0;

  await AttendanceModel.findOneAndUpdate(
    { userId: session.user.id, dateKey },
    {
      $setOnInsert: {
        userId: session.user.id,
        dateKey,
        checkInAt: now,
        status: "PRESENT",
        workMode,
        isLate,
        lateByMinutes,
      },
    },
    { returnDocument: "after", upsert: true },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
}

export async function checkOutAttendance() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);

  const existingAttendance = await AttendanceModel.findOne({ userId: session.user.id, dateKey }).lean();

  if (!existingAttendance) {
    throw new Error("Check in first before checking out.");
  }

  await AttendanceModel.findOneAndUpdate(
    { userId: session.user.id, dateKey },
    {
      $set: {
        checkOutAt: now,
        status: "COMPLETED",
      },
    },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
}


