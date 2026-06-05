import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const REGULARIZATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type RegularizationStatus = (typeof REGULARIZATION_STATUSES)[number];

const attendanceRegularizationSchema = new mongoose.Schema(
  {
    userId:             { type: String, required: true, index: true },
    dateKey:            { type: String, required: true },
    requestedCheckIn:   { type: String, required: true },
    requestedCheckOut:  { type: String, default: "" },
    workMode:           { type: String, default: "OFFICE" },
    reason:             { type: String, required: true, trim: true, maxlength: 500 },
    status:             { type: String, enum: REGULARIZATION_STATUSES, default: "PENDING" },
    reviewedByUserId:   { type: String, default: "" },
    reviewedByName:     { type: String, default: "" },
    reviewNote:         { type: String, default: "" },
    reviewedAt:         { type: Date, default: null },
  },
  baseSchemaOptions,
);

attendanceRegularizationSchema.index({ userId: 1, dateKey: 1 });
attendanceRegularizationSchema.index({ status: 1 });

export type AttendanceRegularizationRecord = InferSchemaType<typeof attendanceRegularizationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AttendanceRegularizationModel =
  (mongoose.models.AttendanceRegularization as Model<AttendanceRegularizationRecord> | undefined) ??
  mongoose.model<AttendanceRegularizationRecord>("AttendanceRegularization", attendanceRegularizationSchema);
