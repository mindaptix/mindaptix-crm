"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import {
  SALES_CALL_STATUSES,
  SALES_LEAD_PRIORITIES,
  SALES_LEAD_SOURCES,
  SALES_LEAD_STATUSES,
  SALES_TECH_OPTIONS,
  SalesLeadModel,
} from "@/database/mongodb/models/sales-lead";
import { SalesCustomerModel } from "@/database/mongodb/models/sales-customer";
import { SalesDealModel } from "@/database/mongodb/models/sales-deal";
import { SalesFollowUpModel } from "@/database/mongodb/models/sales-follow-up";
import { UserModel } from "@/database/mongodb/models/user";

export type SalesLeadFormState = {
  error?: string;
  success?: string;
  values?: {
    salesUserId?: string;
    companyName?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    source?: string;
    status?: string;
    priority?: string;
    technologies?: string[];
    meetingLink?: string;
    meetingDate?: string;
    meetingTime?: string;
    nextFollowUpDate?: string;
    expectedCloseDate?: string;
    budget?: string;
    pitchedPrice?: string;
    deliveryDate?: string;
    notes?: string;
    callStatus?: string;
    dateOfFirstCall?: string;
    dateOfLastCall?: string;
    callbackReminderDate?: string;
    callNotes?: string;
  };
};

export type UpdateCallFormState = {
  error?: string;
  success?: string;
};

export async function createSalesLead(
  _previousState: SalesLeadFormState,
  formData: FormData,
): Promise<SalesLeadFormState> {
  const session = await getCurrentSession();

  const isSalesRole = session?.user.role === "SALES";
  const isAdminOrManager = session?.user.role === "SUPER_ADMIN" || session?.user.role === "MANAGER";

  if (!session || (!isSalesRole && !isAdminOrManager)) {
    return { error: "Access denied." };
  }

  // SALES employees always create leads for themselves; admins pick from dropdown
  const salesUserId = isSalesRole
    ? session.user.id
    : String(formData.get("salesUserId") ?? "").trim();

  const companyName = String(formData.get("companyName") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "").trim();
  const status = isSalesRole ? "CONTACTED" : String(formData.get("status") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();
  const technologies = formData
    .getAll("technologies")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const meetingLink = String(formData.get("meetingLink") ?? "").trim();
  const meetingDate = String(formData.get("meetingDate") ?? "").trim();
  const meetingTime = String(formData.get("meetingTime") ?? "").trim();
  const nextFollowUpDate = String(formData.get("nextFollowUpDate") ?? "").trim();
  const expectedCloseDate = String(formData.get("expectedCloseDate") ?? "").trim();
  const budget = String(formData.get("budget") ?? "").trim();
  const pitchedPrice = String(formData.get("pitchedPrice") ?? "").trim();
  const deliveryDate = String(formData.get("deliveryDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const callStatus = String(formData.get("callStatus") ?? "").trim();
  const dateOfFirstCall = String(formData.get("dateOfFirstCall") ?? "").trim();
  const dateOfLastCall = String(formData.get("dateOfLastCall") ?? "").trim();
  const callbackReminderDate = String(formData.get("callbackReminderDate") ?? "").trim();
  const callNotes = String(formData.get("callNotes") ?? "").trim();

  const values = {
    salesUserId,
    companyName,
    clientName,
    clientPhone,
    clientEmail,
    source,
    status,
    priority,
    technologies,
    meetingLink,
    meetingDate,
    meetingTime,
    nextFollowUpDate,
    expectedCloseDate,
    budget,
    pitchedPrice,
    deliveryDate,
    notes,
    callStatus,
    dateOfFirstCall,
    dateOfLastCall,
    callbackReminderDate,
    callNotes,
  };

  if (!salesUserId) {
    return { error: "Select a sales employee first.", values };
  }

  if (clientName.length < 2 || clientName.length > 120) {
    return { error: "Client name must be between 2 and 120 characters.", values };
  }

  if (clientPhone && !/^[0-9+\-()\s]{7,20}$/.test(clientPhone)) {
    return { error: "Enter a valid client phone number.", values };
  }

  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { error: "Enter a valid client email address.", values };
  }

  if (!SALES_LEAD_SOURCES.includes(source as (typeof SALES_LEAD_SOURCES)[number])) {
    return { error: "Select a valid lead source.", values };
  }

  if (!isAdminOrManager && callStatus && !SALES_CALL_STATUSES.includes(callStatus as (typeof SALES_CALL_STATUSES)[number])) {
    return { error: "Select a valid call status.", values };
  }

  if (isAdminOrManager && !SALES_LEAD_STATUSES.includes(status as (typeof SALES_LEAD_STATUSES)[number])) {
    return { error: "Select a valid lead status.", values };
  }

  if (!SALES_LEAD_PRIORITIES.includes(priority as (typeof SALES_LEAD_PRIORITIES)[number])) {
    return { error: "Select a valid lead priority.", values };
  }

  if (technologies.length === 0) {
    return { error: "Select at least one technology.", values };
  }

  if (technologies.some((item) => !SALES_TECH_OPTIONS.includes(item as (typeof SALES_TECH_OPTIONS)[number]))) {
    return { error: "One or more selected technologies are invalid.", values };
  }

  if (meetingLink && !/^https?:\/\//i.test(meetingLink)) {
    return { error: "Meeting link must start with http:// or https://", values };
  }

  const parsedBudget = Number(budget || "0");
  const parsedPitchedPrice = Number(pitchedPrice || "0");

  if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
    return { error: "Budget must be a valid positive number.", values };
  }

  if (!Number.isFinite(parsedPitchedPrice) || parsedPitchedPrice < 0) {
    return { error: "Pitched price must be a valid positive number.", values };
  }

  if (notes.length > 2000) {
    return { error: "Notes must be 2000 characters or fewer.", values };
  }

  if (callNotes.length > 2000) {
    return { error: "Call notes must be 2000 characters or fewer.", values };
  }

  await connectDb();

  const salesUser = await UserModel.findById(salesUserId, { role: 1, status: 1, fullName: 1 }).lean();

  if (!salesUser) {
    return { error: "Selected user not found.", values };
  }

  // Super admin / manager can create pitches for themselves (self-pitch)
  // For others, only SALES role accounts are valid targets
  const isSelfPitch = isAdminOrManager && salesUserId === session.user.id;
  const isValidSalesTarget = salesUser.role === "SALES" || isSelfPitch;

  if (!isValidSalesTarget) {
    return { error: "Select a sales employee or choose 'Personal Pitch (Me)' to assign to yourself.", values };
  }

  if (salesUser.status !== "ACTIVE") {
    return { error: "Selected user account is suspended.", values };
  }

  const lead = await SalesLeadModel.create({
    salesUserId,
    companyName,
    clientName,
    clientPhone,
    clientEmail,
    source,
    status,
    priority,
    technologies,
    meetingLink,
    meetingDate,
    meetingTime,
    nextFollowUpDate,
    expectedCloseDate,
    budget: parsedBudget,
    pitchedPrice: parsedPitchedPrice,
    deliveryDate,
    notes,
    callStatus,
    dateOfFirstCall,
    dateOfLastCall,
    callbackReminderDate,
    callNotes,
  });

  if (nextFollowUpDate) {
    await SalesFollowUpModel.create({
      salesLeadId: lead._id.toString(),
      salesUserId,
      clientName,
      followUpDate: nextFollowUpDate,
      followUpTime: meetingTime,
      channel: meetingLink ? "MEETING" : "CALL",
      status: "PENDING",
      outcome: status === "NEW" ? "First touch pending" : `Lead marked as ${status.replaceAll("_", " ")}`,
      note: notes,
      nextFollowUpDate,
    });
  }

  if (parsedPitchedPrice > 0) {
    await SalesDealModel.create({
      salesLeadId: lead._id.toString(),
      salesUserId,
      title: companyName ? `${companyName} opportunity` : `${clientName} opportunity`,
      stage: mapLeadStatusToDealStage(status),
      status: status === "WON" ? "WON" : status === "LOST" ? "LOST" : "OPEN",
      amount: parsedPitchedPrice,
      probability: mapLeadPriorityToProbability(priority),
      expectedCloseDate,
      lostReason: status === "LOST" ? notes.slice(0, 500) : "",
      note: notes,
    });
  }

  if (status === "WON") {
    await SalesCustomerModel.create({
      salesUserId,
      leadId: lead._id.toString(),
      companyName,
      clientName,
      clientPhone,
      clientEmail,
      status: "ACTIVE",
      lastContactDate: nextFollowUpDate || meetingDate || deliveryDate || expectedCloseDate,
      totalBilledAmount: parsedPitchedPrice,
      outstandingAmount: 0,
      notes,
    });
  }

  await UserModel.findByIdAndUpdate(salesUserId, {
    $addToSet: { leadIds: lead._id.toString() },
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");

  return {
    success: "Sales record saved successfully.",
    values: {
      salesUserId,
      companyName,
      source,
      status,
      priority,
      technologies,
      meetingDate,
      meetingTime,
      nextFollowUpDate,
      expectedCloseDate,
      budget: "",
      pitchedPrice: "",
      deliveryDate,
      notes: "",
      callStatus: "",
      dateOfFirstCall,
      dateOfLastCall,
      callbackReminderDate: "",
      callNotes: "",
    },
  };
}

export async function updateSalesLeadCall(
  _previousState: UpdateCallFormState,
  formData: FormData,
): Promise<UpdateCallFormState> {
  const session = await getCurrentSession();

  if (!session) return { error: "Not authenticated." };

  const isSalesRole = session.user.role === "SALES";
  const isAdminOrManager = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  if (!isSalesRole && !isAdminOrManager) {
    return { error: "Access denied." };
  }

  const leadId = String(formData.get("leadId") ?? "").trim();
  const callStatus = String(formData.get("callStatus") ?? "").trim();
  const dateOfLastCall = String(formData.get("dateOfLastCall") ?? "").trim();
  const nextFollowUpDate = String(formData.get("nextFollowUpDate") ?? "").trim();
  const callbackReminderDate = String(formData.get("callbackReminderDate") ?? "").trim();
  const callNotes = String(formData.get("callNotes") ?? "").trim();

  if (!leadId) return { error: "Lead ID is required." };

  if (callStatus && !SALES_CALL_STATUSES.includes(callStatus as (typeof SALES_CALL_STATUSES)[number])) {
    return { error: "Invalid call status." };
  }

  if (callNotes.length > 2000) return { error: "Call notes must be 2000 characters or fewer." };

  await connectDb();

  const lead = await SalesLeadModel.findById(leadId, { salesUserId: 1 }).lean();
  if (!lead) return { error: "Lead not found." };

  if (isSalesRole && lead.salesUserId !== session.user.id) {
    return { error: "You can only update your own leads." };
  }

  const updateFields: Record<string, string> = {};
  if (callStatus) updateFields.callStatus = callStatus;
  if (dateOfLastCall) updateFields.dateOfLastCall = dateOfLastCall;
  if (nextFollowUpDate) updateFields.nextFollowUpDate = nextFollowUpDate;
  if (callbackReminderDate) updateFields.callbackReminderDate = callbackReminderDate;
  if (callNotes) updateFields.callNotes = callNotes;

  await SalesLeadModel.findByIdAndUpdate(leadId, { $set: updateFields });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");

  return { success: "Call log updated." };
}

function mapLeadStatusToDealStage(status: string) {
  switch (status) {
    case "PROPOSAL_SENT":
      return "PROPOSAL";
    case "NEGOTIATION":
      return "NEGOTIATION";
    case "WON":
      return "WON";
    case "LOST":
      return "LOST";
    default:
      return "DISCOVERY";
  }
}

function mapLeadPriorityToProbability(priority: string) {
  switch (priority) {
    case "HOT":
      return 80;
    case "COLD":
      return 30;
    default:
      return 55;
  }
}
