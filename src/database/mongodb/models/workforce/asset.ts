import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const ASSET_CATEGORIES = [
  "LAPTOP", "PHONE", "MONITOR", "KEYBOARD", "MOUSE",
  "HEADSET", "TABLET", "HARD_DISK", "WEBCAM", "CHAIR", "OTHER",
] as const;

export const ASSET_STATUSES = ["AVAILABLE", "ASSIGNED", "RETURNED", "LOST", "DAMAGED"] as const;
export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR"] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type AssetStatus   = (typeof ASSET_STATUSES)[number];
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

const assetSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true, maxlength: 120 },
    brand:              { type: String, trim: true, maxlength: 80, default: "" },
    model:              { type: String, trim: true, maxlength: 120, default: "" },
    category:           { type: String, enum: ASSET_CATEGORIES, required: true },
    serialNumber:       { type: String, trim: true, maxlength: 120, default: "" },
    purchaseDate:       { type: String, default: "" },
    purchasePrice:      { type: Number, default: 0 },
    condition:          { type: String, enum: ASSET_CONDITIONS, default: "GOOD" },
    notes:              { type: String, trim: true, maxlength: 400, default: "" },
    status:             { type: String, enum: ASSET_STATUSES, default: "AVAILABLE" },
    assignedToUserId:   { type: String, default: "", index: true },
    assignedToName:     { type: String, default: "" },
    assignedByUserId:   { type: String, default: "" },
    assignedAt:         { type: Date, default: null },
    returnedAt:         { type: Date, default: null },
    fineAmount:         { type: Number, default: 0 },
    fineNote:           { type: String, default: "", trim: true, maxlength: 300 },
  },
  baseSchemaOptions,
);

assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });

export type AssetRecord = InferSchemaType<typeof assetSchema> & { _id: mongoose.Types.ObjectId };

export const AssetModel =
  (mongoose.models.Asset as Model<AssetRecord> | undefined) ??
  mongoose.model<AssetRecord>("Asset", assetSchema);
