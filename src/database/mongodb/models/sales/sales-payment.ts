import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const SALES_PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;

export type SalesPaymentStatus = (typeof SALES_PAYMENT_STATUSES)[number];

const salesPaymentSchema = new mongoose.Schema(
  {
    salesUserId: {
      type: String,
      required: true,
      index: true,
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    projectName: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },
    customerId: {
      type: String,
      trim: true,
      default: "",
    },
    dealId: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: String,
      trim: true,
      default: "",
    },
    receivedDate: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: SALES_PAYMENT_STATUSES,
      default: "PENDING",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  baseSchemaOptions,
);

salesPaymentSchema.index({ salesUserId: 1, status: 1, dueDate: 1 });
salesPaymentSchema.index({ customerId: 1, dealId: 1 });

export type SalesPaymentRecord = InferSchemaType<typeof salesPaymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SalesPaymentModel =
  ((mongoose.models.SalesPayment as Model<SalesPaymentRecord> | undefined) ??
    mongoose.model<SalesPaymentRecord>("SalesPayment", salesPaymentSchema));
