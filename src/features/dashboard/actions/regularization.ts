"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AttendanceRegularizationModel } from "@/database/mongodb/models/workforce/attendance-regularization";
import { AttendanceModel } from "@/database/mongodb/models/attendance";

type RegularizationState = { error?: string; success?: string };

export async function submitRegularizationRequest(
  _prev: RegularizationState,
  formData: FormData,
): Promise<RegularizationState> {
  const session = await getCurrentSession();
  if (!session) return { error: "Please sign in again." };

  const dateKey           = String(formData.get("dateKey") ?? "").trim();
  const requestedCheckIn  = String(formData.get("requestedCheckIn") ?? "").trim();
  const requestedCheckOut = String(formData.get("requestedCheckOut") ?? "").trim();
  const workMode          = String(formData.get("workMode") ?? "OFFICE").trim();
  const reason            = String(formData.get("reason") ?? "").trim();

  if (!dateKey || !requestedCheckIn || reason.length < 5) {
    return { error: "Date, check-in time, and reason (min 5 chars) are required." };
  }

  if (dateKey > new Date().toISOString().slice(0, 10)) {
    return { error: "You cannot regularize a future date." };
  }

  await connectDb();

  const existing = await AttendanceRegularizationModel.findOne({ userId: session.user.id, dateKey }).lean();
  if (existing) {
    return { error: "A regularization request for this date already exists." };
  }

  await AttendanceRegularizationModel.create({
    userId: session.user.id,
    dateKey,
    requestedCheckIn,
    requestedCheckOut,
    workMode,
    reason,
    status: "PENDING",
  });

  revalidatePath("/dashboard/attendance");
  return { success: "Regularization request submitted. Admin will review it shortly." };
}

export async function reviewRegularizationRequest(
  _prev: RegularizationState,
  formData: FormData,
): Promise<RegularizationState> {
  const session = await getCurrentSession();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { error: "Only admin can review requests." };
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

  revalidatePath("/dashboard/attendance");
  return { success: `Request ${action === "APPROVED" ? "approved" : "rejected"} successfully.` };
}
