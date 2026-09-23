import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const SALES_CUSTOMER_STATUSES = ["ACTIVE", "DORMANT", "REPEAT", "CHURNED"] as const;

export type SalesCustomerStatus = (typeof SALES_CUSTOMER_STATUSES)[number];

const salesCustomerSchema = new mongoose.Schema(
  {
    salesUserId: {
      type: String,
      required: true,
      index: true,
    },
    leadId: {
      type: String,
      trim: true,
      default: "",
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    clientPhone: {
      type: String,
      trim: true,
      maxlength: 32,
      default: "",
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      default: "",
    },
    country: { type: String, trim: true, maxlength: 80, default: "" },
    projectId: { type: String, trim: true, default: "", index: true },
    status: {
      type: String,
      enum: SALES_CUSTOMER_STATUSES,
      default: "ACTIVE",
      required: true,
    },
    lastContactDate: {
      type: String,
      trim: true,
      default: "",
    },
    totalBilledAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  baseSchemaOptions,
);

salesCustomerSchema.index({ salesUserId: 1, status: 1, updatedAt: -1 });
salesCustomerSchema.index({ leadId: 1 });
salesCustomerSchema.index({ clientEmail: 1, clientPhone: 1 });

export type SalesCustomerRecord = InferSchemaType<typeof salesCustomerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SalesCustomerModel =
  ((mongoose.models.SalesCustomer as Model<SalesCustomerRecord> | undefined) ??
    mongoose.model<SalesCustomerRecord>("SalesCustomer", salesCustomerSchema));
