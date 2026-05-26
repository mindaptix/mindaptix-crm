"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { AnnouncementModel } from "@/database/mongodb/models/system/announcement";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";
import { headers } from "next/headers";

type AnnouncementState = { error?: string; success?: string };

export async function createAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const session = await getCurrentSession();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { error: "Only admins can create announcements." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "GENERAL").trim();
  const isPinned = formData.get("isPinned") === "true";
  const expiresAt = String(formData.get("expiresAt") ?? "").trim();

  if (!title || title.length < 3) return { error: "Title must be at least 3 characters." };
  if (!body || body.length < 5) return { error: "Announcement body is required." };

  await connectDb();

  await AnnouncementModel.create({
    title,
    body,
    type,
    isPinned,
    expiresAt: expiresAt || null,
    createdByUserId: session.user.id,
    createdByName: session.user.fullName,
  });

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "ANNOUNCEMENT_CREATED",
    targetName: title,
    detail: type,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/announcements");
  return { success: "Announcement posted successfully." };
}

export async function deleteAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const session = await getCurrentSession();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { error: "Only admins can delete announcements." };
  }

  const announcementId = String(formData.get("announcementId") ?? "").trim();
  if (!announcementId) return { error: "Announcement ID is required." };

  await connectDb();
  const announcement = await AnnouncementModel.findByIdAndDelete(announcementId).lean();
  if (!announcement) return { error: "Announcement not found." };

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "ANNOUNCEMENT_DELETED",
    targetName: announcement.title,
    detail: "",
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/announcements");
  return { success: "Announcement deleted." };
}

export async function togglePinAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const session = await getCurrentSession();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { error: "Only admins can pin announcements." };
  }

  const announcementId = String(formData.get("announcementId") ?? "").trim();
  if (!announcementId) return { error: "Announcement ID is required." };

  await connectDb();
  const announcement = await AnnouncementModel.findById(announcementId).lean();
  if (!announcement) return { error: "Announcement not found." };

  await AnnouncementModel.findByIdAndUpdate(announcementId, { isPinned: !announcement.isPinned });
  revalidatePath("/dashboard/announcements");
  return { success: announcement.isPinned ? "Announcement unpinned." : "Announcement pinned." };
}
