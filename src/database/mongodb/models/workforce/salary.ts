import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const SALARY_STATUSES = ["ACTIVE", "REVISED", "INACTIVE"] as const;
export type SalaryStatus = (typeof SALARY_STATUSES)[number];

const salarySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    basicSalary: { type: Number, required: true, min: 0, default: 0 },
    hra: { type: Number, default: 0, min: 0 },
    transportAllowance: { type: Number, default: 0, min: 0 },
    medicalAllowance: { type: Number, default: 0, min: 0 },
    otherAllowances: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    providentFund: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    effectiveFrom: { type: String, required: true },
    status: { type: String, enum: SALARY_STATUSES, default: "ACTIVE", required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    createdByUserId: { type: String, required: true },
  },
  baseSchemaOptions,
);

salarySchema.index({ userId: 1, status: 1 });

export type SalaryRecord = InferSchemaType<typeof salarySchema> & { _id: mongoose.Types.ObjectId };

export const SalaryModel =
  (mongoose.models.Salary as Model<SalaryRecord> | undefined) ??
  mongoose.model<SalaryRecord>("Salary", salarySchema);
