import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const SALARY_ADJUSTMENT_KINDS = ["DEDUCTION", "BONUS"] as const;

const salaryAdjustmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    monthKey: { type: String, required: true, index: true },
    kind: { type: String, enum: SALARY_ADJUSTMENT_KINDS, required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    effectiveDate: { type: String, required: true },
    sourceKey: { type: String, required: true, unique: true, maxlength: 180 },
    createdByUserId: { type: String, required: true },
  },
  baseSchemaOptions,
);

salaryAdjustmentSchema.index({ userId: 1, monthKey: 1, kind: 1, effectiveDate: -1 });

export type SalaryAdjustmentRecord = InferSchemaType<typeof salaryAdjustmentSchema> & { _id: mongoose.Types.ObjectId };

export const SalaryAdjustmentModel =
  (mongoose.models.SalaryAdjustment as Model<SalaryAdjustmentRecord> | undefined) ??
  mongoose.model<SalaryAdjustmentRecord>("SalaryAdjustment", salaryAdjustmentSchema);
