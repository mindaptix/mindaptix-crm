"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceRegularizationModel } from "@/database/mongodb/models/workforce/attendance-regularization";
import { AttendanceModel } from "@/database/mongodb/models/attendance";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { UserModel } from "@/database/mongodb/models/user";
import { createNotification, createNotificationsForUsers } from "@/features/notifications/service";
import { COMPANY_HOLIDAYS_2026, COMPANY_WORK_POLICY } from "@/features/dashboard/lib/work-calendar";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

type RegularizationState = { error?: string; success?: string };

export async function submitRegularizationRequest(
  _prev: RegularizationState,
  formData: FormData,
): Promise<RegularizationState> {
  const session = await getCurrentSession();
  if (!session) return { error: "Please sign in again." };
  if (session.user.role !== "EMPLOYEE") {
    return { error: "Only employees can submit missed-attendance requests." };
  }

  const dateKey           = String(formData.get("dateKey") ?? "").trim();
  const requestedCheckIn  = String(formData.get("requestedCheckIn") ?? "").trim();
  const requestedCheckOut = String(formData.get("requestedCheckOut") ?? "").trim();
  const workMode          = String(formData.get("workMode") ?? "OFFICE").trim();
  const reason            = String(formData.get("reason") ?? "").trim();

  if (!dateKey || !requestedCheckIn || reason.length < 5) {
    return { error: "Date, check-in time, and reason (min 5 chars) are required." };
  }

  const today = formatIndiaDateKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || dateKey >= today) {
    return { error: "You can request attendance only for a past working day." };
  }

  await connectDb();

  const requestedDate = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(requestedDate.getTime()) || requestedDate.toISOString().slice(0, 10) !== dateKey) {
    return { error: "Please select a valid date." };
  }
  const isWeeklyOff = COMPANY_WORK_POLICY.weeklyOffDays.includes(requestedDate.getUTCDay() as 0 | 6);
  const isDefaultHoliday = COMPANY_HOLIDAYS_2026.some((holiday) => holiday.date === dateKey);
  const isCustomHoliday = Boolean(await HolidayModel.exists({ date: dateKey }));
  if (isWeeklyOff || isDefaultHoliday || isCustomHoliday) {
    return { error: "Attendance correction is available only for company working days." };
  }

  const existingAttendance = await AttendanceModel.exists({ userId: session.user.id, dateKey });
  if (existingAttendance) {
    return { error: "Attendance is already marked for this date." };
  }

  const existing = await AttendanceRegularizationModel.findOne({ userId: session.user.id, dateKey }).lean();
  if (existing) {
    return { error: "A regularization request for this date already exists." };
  }

  const request = await AttendanceRegularizationModel.create({
    userId: session.user.id,
    dateKey,
    requestedCheckIn,
    requestedCheckOut,
    workMode,
    reason,
    status: "PENDING",
  });

  const superAdmins = await UserModel.find(
    { role: "SUPER_ADMIN", status: "ACTIVE" },
    { _id: 1 },
  ).lean();
  await createNotificationsForUsers(
    superAdmins.map((admin) => admin._id.toString()),
    {
      actorUserId: session.user.id,
      type: "ATTENDANCE_REGULARIZATION_REQUESTED",
      title: "Missed attendance approval requested",
      message: `${session.user.fullName} requested attendance approval for ${dateKey}.`,
      actionUrl: "/dashboard/regularize",
      sourceKey: `attendance-regularization-request:${request._id.toString()}`,
    },
  );

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/regularize");
  revalidatePath("/dashboard");
  return { success: "Request sent to the Super Admin for approval." };
}

export async function reviewRegularizationRequest(
  _prev: RegularizationState,
  formData: FormData,
): Promise<RegularizationState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { error: "Only a Super Admin can review requests." };
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const action    = String(formData.get("action") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!requestId || !["APPROVED", "REJECTED"].includes(action)) {
    return { error: "Invalid review payload." };
  }

  await connectDb();

  const request = await AttendanceRegularizationModel.findById(requestId).lean();
  if (!request) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "This request has already been reviewed." };

  await AttendanceRegularizationModel.findByIdAndUpdate(requestId, {
    status: action,
    reviewedByUserId: session.user.id,
    reviewedByName: session.user.fullName,
    reviewNote,
    reviewedAt: new Date(),
  });

  if (action === "APPROVED") {
    const checkInDate  = new Date(`${request.dateKey}T${request.requestedCheckIn}:00+05:30`);
    const checkOutDate = request.requestedCheckOut
      ? new Date(`${request.dateKey}T${request.requestedCheckOut}:00+05:30`)
      : null;

    await AttendanceModel.findOneAndUpdate(
      { userId: request.userId, dateKey: request.dateKey },
      {
        userId: request.userId,
        dateKey: request.dateKey,
        checkInAt: checkInDate,
        checkOutAt: checkOutDate,
        status: checkOutDate ? "COMPLETED" : "PRESENT",
        workMode: request.workMode ?? "OFFICE",
        regularizationReason: request.reason,
      },
      { upsert: true, new: true },
    );
  }

  await createNotification({
    recipientUserId: request.userId,
    actorUserId: session.user.id,
    type: "ATTENDANCE_REGULARIZATION_REVIEWED",
    title: action === "APPROVED" ? "Attendance correction approved" : "Attendance correction declined",
    message: action === "APPROVED"
      ? `Your attendance for ${request.dateKey} has been marked present.`
      : `Your attendance correction request for ${request.dateKey} was declined${reviewNote ? `: ${reviewNote}` : "."}`,
    actionUrl: "/dashboard/attendance",
    sourceKey: `attendance-regularization-review:${request._id.toString()}:${action}`,
  });

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/regularize");
  revalidatePath("/dashboard");
  return { success: `Request ${action === "APPROVED" ? "approved" : "rejected"} successfully.` };
}

export async function deleteRegularizationRequest(
  _prev: RegularizationState,
  formData: FormData,
): Promise<RegularizationState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { error: "Only a Super Admin can delete requests." };
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) {
    return { error: "Invalid delete payload." };
  }

  await connectDb();

  const request = await AttendanceRegularizationModel.findById(requestId).lean();
  if (!request) {
    return { error: "Request not found." };
  }

  await AttendanceRegularizationModel.findByIdAndDelete(requestId);

  revalidatePath("/dashboard/regularize");
  revalidatePath("/dashboard/attendance");
  return { success: "Request deleted successfully." };
}
