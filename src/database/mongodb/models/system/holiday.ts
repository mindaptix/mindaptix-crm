import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const HOLIDAY_TYPES = ["PUBLIC", "OPTIONAL", "COMPANY"] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    date: { type: String, required: true },
    year: { type: Number, required: true, index: true },
    type: { type: String, enum: HOLIDAY_TYPES, default: "PUBLIC", required: true },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    createdByUserId: { type: String, required: true },
  },
  baseSchemaOptions,
);

holidaySchema.index({ year: 1, date: 1 });

export type HolidayRecord = InferSchemaType<typeof holidaySchema> & { _id: mongoose.Types.ObjectId };

export const HolidayModel =
  (mongoose.models.Holiday as Model<HolidayRecord> | undefined) ??
  mongoose.model<HolidayRecord>("Holiday", holidaySchema);
