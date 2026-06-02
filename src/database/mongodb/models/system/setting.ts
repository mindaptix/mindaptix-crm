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
      default: "10:00",
    },
    workEnd: {
      type: String,
      required: true,
      default: "19:00",
    },
    workingDays: {
      type: Number,
      default: 26,
    },
    salaryDay: {
      type: Number,
      default: 1,
    },
    lateGraceMinutes: {
      type: Number,
      default: 15,
    },
    leavePolicy: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "Paid Leave and Sick Leave are available for approved requests.",
    },
    officeName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "Vista Business Tower",
    },
    officeAddress: {
      type: String,
      trim: true,
      maxlength: 400,
      default: "D270 Phase, 8B, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307",
    },
    officeLatitude: {
      type: Number,
      default: 30.71033,
    },
    officeLongitude: {
      type: Number,
      default: 76.690894,
    },
    geoFenceRadiusMeters: {
      type: Number,
      default: 500,
    },
    geoFenceEnabled: {
      type: Boolean,
      default: true,
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
