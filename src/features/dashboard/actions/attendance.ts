"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { SettingModel } from "@/database/mongodb/models/setting";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";

const VALID_WORK_MODES = ["OFFICE", "WFH", "FIELD"] as const;
type WorkMode = (typeof VALID_WORK_MODES)[number];

// Minutes within which a checkout can be undone
const CHECKOUT_UNDO_WINDOW_MINUTES = 15;
const DEFAULT_OFFICE_LATITUDE = 30.71033;
const DEFAULT_OFFICE_LONGITUDE = 76.690894;
const DEFAULT_GEO_FENCE_RADIUS_METERS = 600;

type CompanySettings = {
  workStart?: string;
  lateGraceMinutes?: number;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  geoFenceRadiusMeters?: number;
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

export async function checkInAttendance(formData: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
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
  const officeLatitude = companySettings.officeLatitude ?? DEFAULT_OFFICE_LATITUDE;
  const officeLongitude = companySettings.officeLongitude ?? DEFAULT_OFFICE_LONGITUDE;
  const geoFenceRadius = Number(companySettings.geoFenceRadiusMeters ?? DEFAULT_GEO_FENCE_RADIUS_METERS);

  // Only enforce geo-fence when admin has explicitly enabled it AND configured office coordinates.
  // Without both, skip the check — cannot verify distance without office coordinates.
  const officeCoordsDefined = officeLatitude !== null && officeLongitude !== null;
  const shouldEnforceGeoFence = workMode === "OFFICE" && geoFenceEnabled && officeCoordsDefined;

  if (shouldEnforceGeoFence) {
    if (employeeLat === null || employeeLng === null || isNaN(employeeLat) || isNaN(employeeLng)) {
      throw new Error(
        "Office attendance ke liye location permission zaroori hai. Browser mein location enable karein aur dobara try karein.",
      );
    }
    const distance = Math.round(
      haversineDistanceMeters(employeeLat, employeeLng, officeLatitude!, officeLongitude!),
    );
    if (distance > geoFenceRadius) {
      throw new Error(
        `Aap office se ${distance} meter door hain. Office ke ${geoFenceRadius} meter andar aakr hi attendance mark kar sakte hain.`,
      );
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
}

export async function checkOutAttendance(formData?: FormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
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
    throw new Error("Pehle check-in karein, phir check-out possible hai.");
  }

  if (existingAttendance.status === "COMPLETED") {
    throw new Error("Aap already check-out kar chuke hain.");
  }

  const settings = await SettingModel.findOne({ key: "company" }).lean();
  const companySettings = (settings ?? {}) as unknown as Partial<CompanySettings>;
  const geoFenceEnabled = Boolean(companySettings.geoFenceEnabled ?? true);
  const officeLatitude = companySettings.officeLatitude ?? DEFAULT_OFFICE_LATITUDE;
  const officeLongitude = companySettings.officeLongitude ?? DEFAULT_OFFICE_LONGITUDE;
  const geoFenceRadius = Number(companySettings.geoFenceRadiusMeters ?? DEFAULT_GEO_FENCE_RADIUS_METERS);
  const shouldEnforceGeoFence =
    existingAttendance.workMode === "OFFICE" &&
    geoFenceEnabled &&
    officeLatitude !== null &&
    officeLongitude !== null;

  if (shouldEnforceGeoFence) {
    if (employeeLat === null || employeeLng === null || isNaN(employeeLat) || isNaN(employeeLng)) {
      throw new Error(
        "Office check-out ke liye location permission zaroori hai. Browser mein location enable karein aur dobara try karein.",
      );
    }

    const distance = Math.round(
      haversineDistanceMeters(employeeLat, employeeLng, officeLatitude, officeLongitude),
    );
    if (distance > geoFenceRadius) {
      throw new Error(
        `Aap office se ${distance} meter door hain. Office ke ${geoFenceRadius} meter andar aakr hi check-out kar sakte hain.`,
      );
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
}

// Undo checkout — only allowed within CHECKOUT_UNDO_WINDOW_MINUTES of checking out
export async function cancelCheckout() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  await connectDb();

  const now = new Date();
  const dateKey = formatIndiaDateKey(now);

  const record = await AttendanceModel.findOne({ userId: session.user.id, dateKey }).lean();

  if (!record) {
    throw new Error("Aaj ki attendance record nahi mili.");
  }

  if (record.status !== "COMPLETED") {
    throw new Error("Aap abhi check-out mein nahi hain.");
  }

  const checkOutAt = record.checkOutAt ? new Date(record.checkOutAt) : null;
  if (!checkOutAt) {
    throw new Error("Check-out time nahi mila.");
  }

  const minutesSinceCheckout = Math.round((now.getTime() - checkOutAt.getTime()) / 60000);
  if (minutesSinceCheckout > CHECKOUT_UNDO_WINDOW_MINUTES) {
    throw new Error(
      `Checkout undo sirf ${CHECKOUT_UNDO_WINDOW_MINUTES} minute ke andar ho sakta hai. ${minutesSinceCheckout} minute ho chuke hain.`,
    );
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
}
