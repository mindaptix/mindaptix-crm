import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const ANNOUNCEMENT_TYPES = ["GENERAL", "URGENT", "POLICY", "EVENT", "HOLIDAY"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    body: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    type: { type: String, enum: ANNOUNCEMENT_TYPES, default: "GENERAL", required: true },
    isPinned: { type: Boolean, default: false },
    targetRoles: { type: [String], default: [] },
    expiresAt: { type: String, default: null },
    createdByUserId: { type: String, required: true },
    createdByName: { type: String, required: true },
  },
  baseSchemaOptions,
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ isPinned: 1, createdAt: -1 });

export type AnnouncementRecord = InferSchemaType<typeof announcementSchema> & { _id: mongoose.Types.ObjectId };

export const AnnouncementModel =
  (mongoose.models.Announcement as Model<AnnouncementRecord> | undefined) ??
  mongoose.model<AnnouncementRecord>("Announcement", announcementSchema);
