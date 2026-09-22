import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const dailyUpdateAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 260,
    },
  },
  { _id: false },
);

const dailyUpdateSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      default: "",
    },
    workDate: {
      type: String,
      required: true,
      trim: true,
    },
    githubRepoUrl: { type: String, default: "", maxlength: 300 },
    githubUsername: { type: String, default: "", maxlength: 39 },
    githubBranch: { type: String, default: "", maxlength: 160 },
    reviewRevision: { type: String, default: "" },
    summary: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 200,
    },
    accomplishments: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 1200,
    },
    blockers: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "",
    },
    nextPlan: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "",
    },
    attachments: {
      type: [dailyUpdateAttachmentSchema],
      default: [],
    },
  },
  baseSchemaOptions,
);

dailyUpdateSchema.index({ userId: 1, workDate: -1 });
dailyUpdateSchema.index({ userId: 1, workDate: 1 });

export type DailyUpdateRecord = InferSchemaType<typeof dailyUpdateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DailyUpdateModel =
  ((mongoose.models.DailyUpdate as Model<DailyUpdateRecord> | undefined) ??
    mongoose.model<DailyUpdateRecord>("DailyUpdate", dailyUpdateSchema));
