"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { UserModel } from "@/database/mongodb/models/workforce/user";
import { assertSuperAdmin } from "@/features/auth/lib/user-admin";
import { SettingModel } from "@/database/mongodb/models/setting";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";

const VALID_WORK_MODES = ["OFFICE", "WFH", "FIELD"] as const;
type WorkMode = (typeof VALID_WORK_MODES)[number];
type AttendanceActionResult = { ok?: true; error?: string };

// Minutes within which a checkout can be undone
const CHECKOUT_UNDO_WINDOW_MINUTES = 15;
const OFFICE_LATITUDE = 30.71033;
const OFFICE_LONGITUDE = 76.690894;
const OFFICE_GEO_FENCE_RADIUS_METERS = 500;

type CompanySettings = {
  workStart?: string;
  lateGraceMinutes?: number;
  geoFenceEnabled?: boolean;
};

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getUnexpectedAttendanceError(error: unknown): AttendanceActionResult {
  console.error("Attendance action failed:", error);
  return { error: "Attendance could not be saved right now. Please refresh and try again." };
}

export async function checkInAttendance(formData: FormData): Promise<AttendanceActionResult> {
  try {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Authentication required." };
  }

  const rawMode = String(formData.get("workMode") ?? "OFFICE");
  const workMode: WorkMode = VALID_WORK_MODES.includes(rawMode as WorkMode) ? (rawMode as WorkMode) : "OFFICE";

  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const accuracyRaw = formData.get("accuracy");
  const employeeLat = latRaw !== null && latRaw !== "" ? parseFloat(String(latRaw)) : null;
  const employeeLng = lngRaw !== null && lngRaw !== "" ? parseFloat(String(lngRaw)) : null;
  const employeeAccuracy = accuracyRaw !== null && accuracyRaw !== "" ? parseFloat(String(accuracyRaw)) : null;

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);
  const currentTimeKey = formatIndiaTimeKey(now);

  const settings = await SettingModel.findOne({ key: "company" }).lean();
  const companySettings = (settings ?? {}) as unknown as Partial<CompanySettings>;
  const workStart: string = companySettings.workStart ?? "09:00";
  const lateGraceMinutes: number = Number(companySettings.lateGraceMinutes ?? 15);
  const geoFenceEnabled = Boolean(companySettings.geoFenceEnabled ?? true);
  const officeLatitude = OFFICE_LATITUDE;
  const officeLongitude = OFFICE_LONGITUDE;
  const geoFenceRadius = OFFICE_GEO_FENCE_RADIUS_METERS;

  // Office attendance is pinned to Vista Business Tower within a 500m radius.
  const shouldEnforceGeoFence = workMode === "OFFICE" && geoFenceEnabled;

  if (shouldEnforceGeoFence) {
    if (employeeLat === null || employeeLng === null || isNaN(employeeLat) || isNaN(employeeLng)) {
      return { error: "Location permission is required for office attendance. Please enable browser location access and try again." };
    }
    const distance = Math.round(
      haversineDistanceMeters(employeeLat, employeeLng, officeLatitude!, officeLongitude!),
    );
    if (distance > geoFenceRadius) {
      return { error: `You are ${distance} meters away from the office. Attendance can only be marked within ${geoFenceRadius} meters of Vista Business Tower.` };
    }
  }

  const currentMinutes = parseTimeToMinutes(currentTimeKey);
  const graceDeadlineMinutes = parseTimeToMinutes(workStart) + lateGraceMinutes;
  const isLate = currentMinutes > graceDeadlineMinutes;
  const lateByMinutes = isLate ? currentMinutes - parseTimeToMinutes(workStart) : 0;

  const checkInLocation =
    employeeLat !== null && employeeLng !== null
      ? { lat: employeeLat, lng: employeeLng, accuracy: employeeAccuracy }
      : undefined;

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
        ...(checkInLocation ? { checkInLocation } : {}),
      },
    },
    { returnDocument: "after", upsert: true },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
  return { ok: true };
  } catch (error) {
    return getUnexpectedAttendanceError(error);
  }
}

export async function checkOutAttendance(formData?: FormData): Promise<AttendanceActionResult> {
  try {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Authentication required." };
  }

  const latRaw = formData?.get("lat");
  const lngRaw = formData?.get("lng");
  const employeeLat = latRaw !== null && latRaw !== undefined && latRaw !== "" ? parseFloat(String(latRaw)) : null;
  const employeeLng = lngRaw !== null && lngRaw !== undefined && lngRaw !== "" ? parseFloat(String(lngRaw)) : null;

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);

  const existingAttendance = await AttendanceModel.findOne({ userId: session.user.id, dateKey }).lean();

  if (!existingAttendance) {
    return { error: "Please check in before checking out." };
  }

  if (existingAttendance.status === "COMPLETED") {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/reports");
    return { ok: true };
  }

  const settings = await SettingModel.findOne({ key: "company" }).lean();
  const companySettings = (settings ?? {}) as unknown as Partial<CompanySettings>;
  const geoFenceEnabled = Boolean(companySettings.geoFenceEnabled ?? true);
  const officeLatitude = OFFICE_LATITUDE;
  const officeLongitude = OFFICE_LONGITUDE;
  const geoFenceRadius = OFFICE_GEO_FENCE_RADIUS_METERS;
  const shouldEnforceGeoFence =
    existingAttendance.workMode === "OFFICE" &&
    geoFenceEnabled;

  if (shouldEnforceGeoFence) {
    if (employeeLat === null || employeeLng === null || isNaN(employeeLat) || isNaN(employeeLng)) {
      return { error: "Location permission is required for office check-out. Please enable browser location access and try again." };
    }

    const distance = Math.round(
      haversineDistanceMeters(employeeLat, employeeLng, officeLatitude, officeLongitude),
    );
    if (distance > geoFenceRadius) {
      return { error: `You are ${distance} meters away from the office. Check-out can only be marked within ${geoFenceRadius} meters of Vista Business Tower.` };
    }
  }

  const checkInAt = existingAttendance.checkInAt;
  const workedMinutes = checkInAt
    ? Math.max(0, Math.round((now.getTime() - new Date(checkInAt).getTime()) / 60000))
    : 0;

  await AttendanceModel.findOneAndUpdate(
    { userId: session.user.id, dateKey },
    {
      $set: {
        checkOutAt: now,
        status: "COMPLETED",
        workedMinutes,
      },
    },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
  return { ok: true };
  } catch (error) {
    return getUnexpectedAttendanceError(error);
  }
}

// Undo checkout — only allowed within CHECKOUT_UNDO_WINDOW_MINUTES of checking out
export async function cancelCheckout(): Promise<AttendanceActionResult> {
  try {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Authentication required." };
  }

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);

  const record = await AttendanceModel.findOne({ userId: session.user.id, dateKey }).lean();

  if (!record) {
    return { error: "No attendance record was found for today." };
  }

  if (record.status !== "COMPLETED") {
    return { error: "You are not checked out right now." };
  }

  const checkOutAt = record.checkOutAt ? new Date(record.checkOutAt) : null;
  if (!checkOutAt) {
    return { error: "Check-out time was not found." };
  }

  const minutesSinceCheckout = Math.round((now.getTime() - checkOutAt.getTime()) / 60000);
  if (minutesSinceCheckout > CHECKOUT_UNDO_WINDOW_MINUTES) {
    return { error: `Check-out can only be undone within ${CHECKOUT_UNDO_WINDOW_MINUTES} minutes. ${minutesSinceCheckout} minutes have already passed.` };
  }

  await AttendanceModel.findOneAndUpdate(
    { userId: session.user.id, dateKey },
    {
      $set: { status: "PRESENT" },
      $unset: { checkOutAt: "", workedMinutes: "" },
    },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");
  return { ok: true };
  } catch (error) {
    return getUnexpectedAttendanceError(error);
  }
}

// ─── Admin: manually set attendance for any employee ────────────────────────

export async function adminManualAttendance(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentSession();

  try {
    assertSuperAdmin(session);
  } catch {
    return { error: "Only Super Admin can manually update attendance." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dateKey = String(formData.get("dateKey") ?? "").trim();
  const checkInTime = String(formData.get("checkInTime") ?? "").trim();
  const checkOutTime = String(formData.get("checkOutTime") ?? "").trim();
  const workMode = String(formData.get("workMode") ?? "OFFICE").trim() as WorkMode;

  if (!email) return { error: "Employee email required." };
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return { error: "Valid date required (YYYY-MM-DD)." };
  if (!checkInTime) return { error: "Check-in time required." };

  await connectDb();

  const user = await UserModel.findOne({ email }, { _id: 1 }).lean();
  if (!user) return { error: `No user found with email: ${email}` };

  const userId = user._id.toString();

  const [inH, inM] = checkInTime.split(":").map(Number);
  const checkInAt = new Date(`${dateKey}T${String(inH).padStart(2, "0")}:${String(inM ?? 0).padStart(2, "0")}:00+05:30`);

  let checkOutAt: Date | null = null;
  let workedMinutes = 0;
  let status = "PRESENT";

  if (checkOutTime) {
    const [outH, outM] = checkOutTime.split(":").map(Number);
    checkOutAt = new Date(`${dateKey}T${String(outH).padStart(2, "0")}:${String(outM ?? 0).padStart(2, "0")}:00+05:30`);
    workedMinutes = Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000));
    status = "COMPLETED";
  }

  await AttendanceModel.findOneAndUpdate(
    { userId, dateKey },
    {
      $set: {
        userId,
        dateKey,
        workMode: VALID_WORK_MODES.includes(workMode) ? workMode : "OFFICE",
        checkInAt,
        ...(checkOutAt ? { checkOutAt, workedMinutes } : {}),
        status,
      },
    },
    { upsert: true },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");

  const hrs = Math.floor(workedMinutes / 60);
  const mins = workedMinutes % 60;
  return {
    success: `Attendance saved for ${email} on ${dateKey}. Check-in: ${checkInTime}${checkOutTime ? `, Check-out: ${checkOutTime} (${hrs}h ${mins}m worked)` : " (no checkout set)"}.`,
  };
}
