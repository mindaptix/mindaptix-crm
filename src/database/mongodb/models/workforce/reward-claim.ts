import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const REWARD_CLAIM_TYPES = ["CLIENT_FEEDBACK", "CANDIDATE_REFERRAL", "PUBLIC_REVIEW"] as const;
export const REWARD_CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

const rewardClaimSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  rewardMonthKey: { type: String, required: true, index: true },
  type: { type: String, enum: REWARD_CLAIM_TYPES, required: true },
  amount: { type: Number, required: true, min: 0 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  details: { type: String, required: true, trim: true, maxlength: 1200 },
  proofName: { type: String, required: true, trim: true, maxlength: 180 },
  proofUrl: { type: String, required: true, trim: true, maxlength: 260 },
  status: { type: String, enum: REWARD_CLAIM_STATUSES, default: "PENDING", required: true, index: true },
  reviewedByUserId: { type: String, default: "" },
  reviewedByName: { type: String, default: "" },
  reviewNote: { type: String, default: "", trim: true, maxlength: 600 },
  reviewedAt: { type: Date, default: null },
}, baseSchemaOptions);

rewardClaimSchema.index({ userId: 1, rewardMonthKey: 1, status: 1 });

export type RewardClaimRecord = InferSchemaType<typeof rewardClaimSchema> & { _id: mongoose.Types.ObjectId };
export const RewardClaimModel =
  (mongoose.models.RewardClaim as Model<RewardClaimRecord> | undefined) ?? mongoose.model<RewardClaimRecord>("RewardClaim", rewardClaimSchema);
