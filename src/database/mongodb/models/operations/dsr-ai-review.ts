import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  sourceHash: { type: String, default: "" },
  status: { type: String, enum: ["idle", "running", "ready", "error"], default: "idle" },
  leaseId: { type: String, default: "" },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  requestedBy: { type: String, default: "" },
  error: { type: String, default: "" },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
}, baseSchemaOptions);

type ReviewRecord = InferSchemaType<typeof schema>;
export const DsrAiReviewModel = (mongoose.models.DsrAiReview as Model<ReviewRecord> | undefined) ?? mongoose.model<ReviewRecord>("DsrAiReview", schema);
