import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const ATTENDANCE_STATUSES = ["PRESENT", "COMPLETED"] as const;
export const WORK_MODES = ["OFFICE", "WFH", "FIELD"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    checkInAt: {
      type: Date,
      required: true,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: "PRESENT",
      required: true,
    },
    workMode: {
      type: String,
      enum: WORK_MODES,
      default: "OFFICE",
      required: true,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateByMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    workedMinutes: {
      type: Number,
      default: 0,
    },
    regularizationReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    checkInLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
  },
  baseSchemaOptions,
);

attendanceSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export type AttendanceRecord = InferSchemaType<typeof attendanceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AttendanceModel =
  ((mongoose.models.Attendance as Model<AttendanceRecord> | undefined) ??
    mongoose.model<AttendanceRecord>("Attendance", attendanceSchema));
