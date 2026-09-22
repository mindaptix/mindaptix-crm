import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    impersonatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    impersonationExpiresAt: { type: Date, default: null },
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    userAgent: {
      type: String,
      default: "",
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      default: "",
      maxlength: 120,
    },
  },
  baseSchemaOptions,
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type UserSessionRecord = InferSchemaType<typeof userSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserSessionModel =
  ((mongoose.models.UserSession as Model<UserSessionRecord> | undefined) ??
    mongoose.model<UserSessionRecord>("UserSession", userSessionSchema));
