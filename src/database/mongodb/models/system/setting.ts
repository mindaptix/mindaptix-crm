import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: "Mindaptix CRM",
    },
    workStart: {
      type: String,
      required: true,
      default: "09:00",
    },
    workEnd: {
      type: String,
      required: true,
      default: "18:00",
    },
    leavePolicy: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "Paid Leave and Sick Leave are available for approved requests.",
    },
    officeLatitude: {
      type: Number,
      default: null,
    },
    officeLongitude: {
      type: Number,
      default: null,
    },
    geoFenceRadiusMeters: {
      type: Number,
      default: 200,
    },
    geoFenceEnabled: {
      type: Boolean,
      default: false,
    },
  },
  baseSchemaOptions,
);

export type SettingRecord = InferSchemaType<typeof settingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SettingModel =
  ((mongoose.models.Setting as Model<SettingRecord> | undefined) ??
    mongoose.model<SettingRecord>("Setting", settingSchema));
