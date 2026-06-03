import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CLOSED", "REJECTED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const TASK_LABELS = ["SEO", "DESIGN", "DEV", "ADS", "CONTENT", "SALES"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskLabel = (typeof TASK_LABELS)[number];

const taskAttachmentSchema = new mongoose.Schema(
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

const taskCommentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 24,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 600,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: true },
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 1000,
    },
    assignedUserId: {
      type: String,
      required: true,
      index: true,
    },
    assignedByUserId: {
      type: String,
      required: true,
    },
    dueDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "PENDING",
      required: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "MEDIUM",
      required: true,
    },
    labels: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.every((label) => TASK_LABELS.includes(label as TaskLabel)),
        message: "Invalid task labels.",
      },
    },
    attachments: {
      type: [taskAttachmentSchema],
      default: [],
    },
    comments: {
      type: [taskCommentSchema],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  baseSchemaOptions,
);

taskSchema.index({ assignedByUserId: 1, status: 1, createdAt: -1 });
taskSchema.index({ assignedUserId: 1, status: 1, createdAt: -1 });
taskSchema.index({ assignedUserId: 1, dueDate: 1, status: 1 });
taskSchema.index({ priority: 1, status: 1, dueDate: 1 });

export type TaskRecord = InferSchemaType<typeof taskSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TaskModel =
  ((mongoose.models.Task as Model<TaskRecord> | undefined) ??
    mongoose.model<TaskRecord>("Task", taskSchema));
