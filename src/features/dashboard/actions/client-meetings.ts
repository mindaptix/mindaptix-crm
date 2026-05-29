"use server";

import { revalidatePath } from "next/cache";
import { SalesLeadModel } from "@/database/mongodb/models/sales-lead";
import { UserModel } from "@/database/mongodb/models/user";
import connectDb from "@/database/mongodb/connect";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertAdminOrManager } from "@/features/auth/lib/user-admin";
import { createNotificationsForUsers, getAdminUserIds } from "@/features/notifications/service";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export type ClientMeetingFormState = {
  error?: string;
  success?: string;
  values?: {
    salesUserId?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    companyName?: string;
    meetingDate?: string;
    meetingTime?: string;
    budget?: string;
    pitchedPrice?: string;
    notes?: string;
  };
};

export async function createClientMeeting(
  _previousState: ClientMeetingFormState,
  formData: FormData,
): Promise<ClientMeetingFormState> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin or manager can add client meetings." };
  }

  const salesUserId = String(formData.get("salesUserId") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const meetingDate = String(formData.get("meetingDate") ?? "").trim();
  const meetingTime = String(formData.get("meetingTime") ?? "").trim();
  const budget = String(formData.get("budget") ?? "").trim();
  const pitchedPrice = String(formData.get("pitchedPrice") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const values = { salesUserId, clientName, clientPhone, clientEmail, companyName, meetingDate, meetingTime, budget, pitchedPrice, notes };

  if (!salesUserId) {
    return { error: "Select a sales owner for this meeting.", values };
  }

  if (clientName.length < 2 || clientName.length > 120) {
    return { error: "Client name must be between 2 and 120 characters.", values };
  }

  if (!meetingDate) {
    return { error: "Meeting date is required.", values };
  }

  if (clientPhone && !/^[0-9+\-()\s]{7,20}$/.test(clientPhone)) {
    return { error: "Enter a valid client phone number.", values };
  }

  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { error: "Enter a valid client email address.", values };
  }

  const parsedBudget = Number(budget || "0");
  const parsedPitchedPrice = Number(pitchedPrice || "0");

  if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
    return { error: "Budget must be a valid positive number.", values };
  }

  if (!Number.isFinite(parsedPitchedPrice) || parsedPitchedPrice < 0) {
    return { error: "Quote must be a valid positive number.", values };
  }

  await connectDb();

  const salesUser = await UserModel.findById(salesUserId, { role: 1, status: 1 }).lean();

  if (!salesUser || salesUser.role !== "SALES" || salesUser.status !== "ACTIVE") {
    return { error: "Selected sales owner is not active.", values };
  }

  const meeting = await SalesLeadModel.create({
    salesUserId,
    companyName,
    clientName,
    clientPhone,
    clientEmail,
    source: "Call",
    status: "CONTACTED",
    priority: "WARM",
    technologies: [],
    meetingDate,
    meetingTime,
    budget: parsedBudget,
    pitchedPrice: parsedPitchedPrice,
    notes,
  });

  if (meetingDate === formatIndiaDateKey()) {
    const adminRecipients = await getAdminUserIds();

    await createNotificationsForUsers([...adminRecipients, salesUserId], {
      actorUserId: session.user.id,
      type: "MEETING_REMINDER",
      title: "Client meeting today",
      message: `${clientName} meeting${meetingTime ? ` at ${meetingTime}` : ""} is scheduled today.`,
      actionUrl: "/dashboard",
      sourceKey: `meeting-reminder:${meeting._id.toString()}:${meetingDate}`,
    });
  }

  revalidatePath("/dashboard");

  return {
    success: "Client meeting added successfully.",
    values: {
      salesUserId,
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      companyName: "",
      meetingDate,
      meetingTime: "",
      budget: "",
      pitchedPrice: "",
      notes: "",
    },
  };
}
