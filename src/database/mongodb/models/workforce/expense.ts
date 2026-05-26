import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const EXPENSE_CATEGORIES = ["TRAVEL", "FOOD", "ACCOMMODATION", "EQUIPMENT", "CLIENT_ENTERTAINMENT", "MOBILE", "INTERNET", "OTHER"] as const;
export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 1 },
    expenseDate: { type: String, required: true },
    description: { type: String, trim: true, maxlength: 600, default: "" },
    receiptUrl: { type: String, trim: true, maxlength: 260, default: "" },
    receiptName: { type: String, trim: true, maxlength: 180, default: "" },
    status: { type: String, enum: EXPENSE_STATUSES, default: "PENDING", required: true },
    reviewedByUserId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, maxlength: 400, default: "" },
    paidOn: { type: String, default: null },
  },
  baseSchemaOptions,
);

expenseSchema.index({ userId: 1, status: 1 });
expenseSchema.index({ status: 1, createdAt: -1 });

export type ExpenseRecord = InferSchemaType<typeof expenseSchema> & { _id: mongoose.Types.ObjectId };

export const ExpenseModel =
  (mongoose.models.Expense as Model<ExpenseRecord> | undefined) ??
  mongoose.model<ExpenseRecord>("Expense", expenseSchema);
