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
const OFFICE_GEO_FENCE_RADIUS_METERS = 1000;
const OFFICE_NAME = "Vista Business Tower";
const OFFICE_ADDRESS = "D270 Phase, 8B, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307";

type CompanySettings = {
  workStart?: string;
  lateGraceMinutes?: number;
  geoFenceEnabled?: boolean;
  geoFenceRadiusMeters?: number;
  officeName?: string;
  officeAddress?: string;
  officeLatitude?: number;
  officeLongitude?: number;
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

function readValidNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getOfficeGeoFence(settings: Partial<CompanySettings>) {
  return {
    label: settings.officeName?.trim() || OFFICE_NAME,
    address: settings.officeAddress?.trim() || OFFICE_ADDRESS,
    lat: readValidNumber(settings.officeLatitude, OFFICE_LATITUDE),
    lng: readValidNumber(settings.officeLongitude, OFFICE_LONGITUDE),
    radiusMeters: Math.max(1, Math.round(readValidNumber(settings.geoFenceRadiusMeters, OFFICE_GEO_FENCE_RADIUS_METERS))),
    enabled: Boolean(settings.geoFenceEnabled ?? true),
  };
}

function readLocationFromForm(formData: FormData | undefined) {
  const latRaw = formData?.get("lat");
  const lngRaw = formData?.get("lng");
  const accuracyRaw = formData?.get("accuracy");
  const lat = latRaw !== null && latRaw !== undefined && latRaw !== "" ? Number(latRaw) : null;
  const lng = lngRaw !== null && lngRaw !== undefined && lngRaw !== "" ? Number(lngRaw) : null;
  const accuracy = accuracyRaw !== null && accuracyRaw !== undefined && accuracyRaw !== "" ? Number(accuracyRaw) : null;

  return {
    lat: lat !== null && Number.isFinite(lat) ? lat : null,
    lng: lng !== null && Number.isFinite(lng) ? lng : null,
    accuracy: accuracy !== null && Number.isFinite(accuracy) ? accuracy : null,
  };
}

function validateOfficeLocation({
  action,
  lat,
  lng,
  office,
}: {
  action: "attendance" | "check-out";
  lat: number | null;
  lng: number | null;
  office: ReturnType<typeof getOfficeGeoFence>;
}): AttendanceActionResult | null {
  if (lat === null || lng === null) {
    return {
      error: `Location permission is required for office ${action}. Please enable location access on your phone or laptop and try again.`,
    };
  }

  const distance = Math.round(haversineDistanceMeters(lat, lng, office.lat, office.lng));
  if (distance <= office.radiusMeters) {
    return null;
  }

  return {
    error: `You are outside the allowed office location. You are ${distance} meters away from ${office.label}; office ${action} is allowed only within ${office.radiusMeters} meters.`,
  };
}

export async function checkInAttendance(formData: FormData): Promise<AttendanceActionResult> {
  try {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Authentication required." };
  }

  const rawMode = String(formData.get("workMode") ?? "OFFICE");
  const workMode: WorkMode = VALID_WORK_MODES.includes(rawMode as WorkMode) ? (rawMode as WorkMode) : "OFFICE";

  const employeeLocation = readLocationFromForm(formData);

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);
  const currentTimeKey = formatIndiaTimeKey(now);

  const settings = await SettingModel.findOne({ key: "company" }).lean();
  const companySettings = (settings ?? {}) as unknown as Partial<CompanySettings>;
  const workStart: string = companySettings.workStart ?? "10:00";
  const lateGraceMinutes: number = Number(companySettings.lateGraceMinutes ?? 15);
  const office = getOfficeGeoFence(companySettings);

  // Office attendance is pinned to the configured office location and radius.
  const shouldEnforceGeoFence = workMode === "OFFICE" && office.enabled;

  if (shouldEnforceGeoFence) {
    const locationError = validateOfficeLocation({
      action: "attendance",
      lat: employeeLocation.lat,
      lng: employeeLocation.lng,
      office,
    });
    if (locationError) {
      return locationError;
    }
  }

  const currentMinutes = parseTimeToMinutes(currentTimeKey);
  const graceDeadlineMinutes = parseTimeToMinutes(workStart) + lateGraceMinutes;
  const isLate = currentMinutes > graceDeadlineMinutes;
  const lateByMinutes = isLate ? currentMinutes - parseTimeToMinutes(workStart) : 0;

  const checkInLocation =
    employeeLocation.lat !== null && employeeLocation.lng !== null
      ? { lat: employeeLocation.lat, lng: employeeLocation.lng, accuracy: employeeLocation.accuracy }
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

  const employeeLocation = readLocationFromForm(formData);

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
  const office = getOfficeGeoFence(companySettings);
  const shouldEnforceGeoFence =
    existingAttendance.workMode === "OFFICE" &&
    office.enabled;

  if (shouldEnforceGeoFence) {
    const locationError = validateOfficeLocation({
      action: "check-out",
      lat: employeeLocation.lat,
      lng: employeeLocation.lng,
      office,
    });
    if (locationError) {
      return locationError;
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
