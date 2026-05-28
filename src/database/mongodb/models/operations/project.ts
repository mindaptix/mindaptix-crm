import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const PROJECT_STATUSES = ["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED"] as const;
export const PROJECT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 600,
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "PLANNING",
      required: true,
    },
    priority: {
      type: String,
      enum: PROJECT_PRIORITIES,
      default: "MEDIUM",
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    techStack: {
      type: [String],
      default: [],
    },
    assignedUserIds: {
      type: [String],
      default: [],
    },
    createdByUserId: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    clientBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    closedByEmployeeId: {
      type: String,
      default: null,
    },
    closedByEmployeeAt: {
      type: Date,
      default: null,
    },
  },
  baseSchemaOptions,
);

export type ProjectRecord = InferSchemaType<typeof projectSchema> & {
  _id: mongoose.Types.ObjectId;
};

const cachedProjectModel = mongoose.models.Project as Model<ProjectRecord> | undefined;
const hasLatestProjectFields =
  cachedProjectModel?.schema.path("techStack") &&
  cachedProjectModel.schema.path("assignedUserIds") &&
  cachedProjectModel.schema.path("createdByUserId") &&
  cachedProjectModel.schema.path("closedByEmployeeId") &&
  cachedProjectModel.schema.path("clientName") &&
  cachedProjectModel.schema.path("clientBudget");

if (cachedProjectModel && !hasLatestProjectFields) {
  delete mongoose.models.Project;
}

export const ProjectModel =
  ((mongoose.models.Project as Model<ProjectRecord> | undefined) ??
    mongoose.model<ProjectRecord>("Project", projectSchema));
