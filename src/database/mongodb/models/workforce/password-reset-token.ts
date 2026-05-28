import mongoose, { type InferSchemaType, type Model } from "mongoose";

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    requestedFromIp: {
      type: String,
      default: "",
      maxlength: 120,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

// MongoDB TTL — auto-deletes expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ userId: 1, used: 1 });

export type PasswordResetTokenRecord = InferSchemaType<typeof passwordResetTokenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PasswordResetTokenModel =
  (mongoose.models.PasswordResetToken as Model<PasswordResetTokenRecord> | undefined) ??
  mongoose.model<PasswordResetTokenRecord>("PasswordResetToken", passwordResetTokenSchema);
