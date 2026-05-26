import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const loginAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    ipAddress: { type: String, default: "" },
    success: { type: Boolean, required: true },
    attemptedAt: { type: Date, required: true, default: Date.now },
  },
  { ...baseSchemaOptions, timestamps: false },
);

loginAttemptSchema.index({ email: 1, attemptedAt: -1 });
loginAttemptSchema.index({ attemptedAt: 1 }, { expireAfterSeconds: 3600 });

export type LoginAttemptRecord = InferSchemaType<typeof loginAttemptSchema> & { _id: mongoose.Types.ObjectId };

export const LoginAttemptModel =
  (mongoose.models.LoginAttempt as Model<LoginAttemptRecord> | undefined) ??
  mongoose.model<LoginAttemptRecord>("LoginAttempt", loginAttemptSchema);
