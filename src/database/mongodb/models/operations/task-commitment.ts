import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

const taskCommitmentSchema = new mongoose.Schema({
  taskId: { type: String, required: true },
  userId: { type: String, required: true },
  responseDate: { type: String, required: true },
  answer: { type: String, enum: ["YES", "NO"], required: true },
  promisedDate: { type: String, default: "" },
  friday: { type: String, required: true, index: true },
}, baseSchemaOptions);
taskCommitmentSchema.index({ userId: 1, taskId: 1, responseDate: 1 }, { unique: true });
export type TaskCommitmentRecord = InferSchemaType<typeof taskCommitmentSchema> & { _id: mongoose.Types.ObjectId };
export const TaskCommitmentModel = (mongoose.models.TaskCommitment as Model<TaskCommitmentRecord> | undefined) ?? mongoose.model<TaskCommitmentRecord>("TaskCommitment", taskCommitmentSchema);
