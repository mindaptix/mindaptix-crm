import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const PAYSLIP_STATUSES = ["DRAFT", "GENERATED", "PAID"] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

const payslipSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    monthKey: { type: String, required: true },
    basicSalary: { type: Number, required: true, default: 0 },
    hra: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true, default: 0 },
    tds: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, required: true, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    presentDays: { type: Number, default: 0 },
    workingDays: { type: Number, default: 26 },
    status: { type: String, enum: PAYSLIP_STATUSES, default: "DRAFT", required: true },
    paidOn: { type: String, default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    generatedByUserId: { type: String, required: true },
  },
  baseSchemaOptions,
);

payslipSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export type PayslipRecord = InferSchemaType<typeof payslipSchema> & { _id: mongoose.Types.ObjectId };

export const PayslipModel =
  (mongoose.models.Payslip as Model<PayslipRecord> | undefined) ??
  mongoose.model<PayslipRecord>("Payslip", payslipSchema);
