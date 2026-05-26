import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const DOCUMENT_TYPES = [
  "OFFER_LETTER",
  "APPOINTMENT_LETTER",
  "RELIEVING_LETTER",
  "PAN_CARD",
  "AADHAAR_CARD",
  "BANK_DETAILS",
  "EDUCATIONAL_CERTIFICATE",
  "EXPERIENCE_LETTER",
  "AGREEMENT",
  "NDA",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const employeeDocumentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    fileName: { type: String, required: true, trim: true, maxlength: 180 },
    fileUrl: { type: String, required: true, trim: true, maxlength: 260 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    expiryDate: { type: String, default: null },
    uploadedByUserId: { type: String, required: true },
  },
  baseSchemaOptions,
);

employeeDocumentSchema.index({ userId: 1, documentType: 1 });

export type EmployeeDocumentRecord = InferSchemaType<typeof employeeDocumentSchema> & { _id: mongoose.Types.ObjectId };

export const EmployeeDocumentModel =
  (mongoose.models.EmployeeDocument as Model<EmployeeDocumentRecord> | undefined) ??
  mongoose.model<EmployeeDocumentRecord>("EmployeeDocument", employeeDocumentSchema);
