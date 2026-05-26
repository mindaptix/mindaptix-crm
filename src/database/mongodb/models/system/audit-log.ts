import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const AUDIT_ACTIONS = [
  "USER_CREATED", "USER_UPDATED", "USER_SUSPENDED", "USER_ACTIVATED",
  "ROLE_CHANGED", "PASSWORD_CHANGED", "SALARY_SET", "PAYSLIP_GENERATED",
  "LEAVE_APPROVED", "LEAVE_REJECTED", "EXPENSE_APPROVED", "EXPENSE_REJECTED",
  "ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_DELETED", "HOLIDAY_ADDED", "HOLIDAY_REMOVED",
  "SETTINGS_UPDATED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetUserId: { type: String, default: null },
    targetName: { type: String, default: "" },
    detail: { type: String, trim: true, maxlength: 500, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { ...baseSchemaOptions },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });

export type AuditLogRecord = InferSchemaType<typeof auditLogSchema> & { _id: mongoose.Types.ObjectId };

export const AuditLogModel =
  (mongoose.models.AuditLog as Model<AuditLogRecord> | undefined) ??
  mongoose.model<AuditLogRecord>("AuditLog", auditLogSchema);
