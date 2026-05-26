"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertSuperAdmin } from "@/features/auth/lib/user-admin";
import connectDb from "@/database/mongodb/connect";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";
import { headers } from "next/headers";

type HolidayState = { error?: string; success?: string };

export async function addHoliday(_prev: HolidayState, formData: FormData): Promise<HolidayState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);

  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const type = String(formData.get("type") ?? "PUBLIC").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || name.length < 2) return { error: "Holiday name is required." };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter a valid date." };

  const year = parseInt(date.split("-")[0], 10);

  await connectDb();

  await HolidayModel.create({
    name,
    date,
    year,
    type,
    description,
    createdByUserId: session.user.id,
  });

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "HOLIDAY_ADDED",
    targetName: name,
    detail: `${date} (${type})`,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/settings");
  return { success: `Holiday "${name}" added.` };
}

export async function deleteHoliday(_prev: HolidayState, formData: FormData): Promise<HolidayState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);

  const holidayId = String(formData.get("holidayId") ?? "").trim();
  if (!holidayId) return { error: "Holiday ID is required." };

  await connectDb();
  const holiday = await HolidayModel.findByIdAndDelete(holidayId).lean();
  if (!holiday) return { error: "Holiday not found." };

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "HOLIDAY_REMOVED",
    targetName: holiday.name,
    detail: holiday.date,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/settings");
  return { success: `Holiday "${holiday.name}" deleted.` };
}
