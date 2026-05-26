import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    year: { type: Number, required: true },
    paidLeaveTotal: { type: Number, default: 12 },
    paidLeaveUsed: { type: Number, default: 0 },
    sickLeaveTotal: { type: Number, default: 6 },
    sickLeaveUsed: { type: Number, default: 0 },
    casualLeaveTotal: { type: Number, default: 8 },
    casualLeaveUsed: { type: Number, default: 0 },
    compOffEarned: { type: Number, default: 0 },
    compOffUsed: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

export type LeaveBalanceRecord = InferSchemaType<typeof leaveBalanceSchema> & { _id: mongoose.Types.ObjectId };

export const LeaveBalanceModel =
  (mongoose.models.LeaveBalance as Model<LeaveBalanceRecord> | undefined) ??
  mongoose.model<LeaveBalanceRecord>("LeaveBalance", leaveBalanceSchema);
