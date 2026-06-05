"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertAdminOrManager } from "@/features/auth/lib/user-admin";
import connectDb from "@/database/mongodb/connect";
import { AssetModel, ASSET_CATEGORIES, ASSET_CONDITIONS } from "@/database/mongodb/models/workforce/asset";
import { UserModel } from "@/database/mongodb/models/user";

type AssetState = { error?: string; success?: string };

export async function addAsset(_prev: AssetState, formData: FormData): Promise<AssetState> {
  const session = await getCurrentSession();
  try { assertAdminOrManager(session); } catch { return { error: "Only admin can manage assets." }; }

  const name     = String(formData.get("name") ?? "").trim();
  const brand    = String(formData.get("brand") ?? "").trim();
  const model    = String(formData.get("model") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const serialNumber = String(formData.get("serialNumber") ?? "").trim();
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim();
  const purchasePriceRaw = String(formData.get("purchasePrice") ?? "0").trim();
  const condition = String(formData.get("condition") ?? "GOOD").trim();
  const notes    = String(formData.get("notes") ?? "").trim();
  const purchasePrice = Number(purchasePriceRaw || 0);

  if (!name || !ASSET_CATEGORIES.includes(category as never)) {
    return { error: "Asset name and a valid category are required." };
  }
  if (!ASSET_CONDITIONS.includes(condition as never)) {
    return { error: "Invalid condition value." };
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return { error: "Purchase price must be a valid amount." };
  }

  await connectDb();
  await AssetModel.create({ name, brand, model, category, serialNumber, purchaseDate, purchasePrice, condition, notes, status: "AVAILABLE" });

  revalidatePath("/dashboard/assets");
  return { success: "Asset added successfully." };
}

export async function assignAsset(_prev: AssetState, formData: FormData): Promise<AssetState> {
  const session = await getCurrentSession();
  try { assertAdminOrManager(session); } catch { return { error: "Only admin can assign assets." }; }

  const assetId  = String(formData.get("assetId") ?? "").trim();
  const userId   = String(formData.get("userId") ?? "").trim();

  if (!assetId || !userId) return { error: "Asset and employee are required." };

  await connectDb();

  const [asset, user] = await Promise.all([
    AssetModel.findById(assetId).lean(),
    UserModel.findById(userId, { fullName: 1 }).lean(),
  ]);

  if (!asset) return { error: "Asset not found." };
  if (!user)  return { error: "Employee not found." };
  if (asset.status === "ASSIGNED") return { error: "Asset is already assigned to someone." };

  await AssetModel.findByIdAndUpdate(assetId, {
    status: "ASSIGNED",
    assignedToUserId: userId,
    assignedToName: user.fullName,
    assignedByUserId: session!.user.id,
    assignedAt: new Date(),
    returnedAt: null,
  });

  revalidatePath("/dashboard/assets");
  return { success: `Asset assigned to ${user.fullName}.` };
}

export async function updateAsset(_prev: AssetState, formData: FormData): Promise<AssetState> {
  const session = await getCurrentSession();
  try { assertAdminOrManager(session); } catch { return { error: "Only admin can update assets." }; }

  const assetId = String(formData.get("assetId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const serialNumber = String(formData.get("serialNumber") ?? "").trim();
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim();
  const purchasePriceRaw = String(formData.get("purchasePrice") ?? "0").trim();
  const condition = String(formData.get("condition") ?? "GOOD").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const purchasePrice = Number(purchasePriceRaw || 0);

  if (!assetId) return { error: "Asset is required." };
  if (!name || !ASSET_CATEGORIES.includes(category as never)) {
    return { error: "Asset name and a valid category are required." };
  }
  if (!ASSET_CONDITIONS.includes(condition as never)) {
    return { error: "Invalid condition value." };
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return { error: "Purchase price must be a valid amount." };
  }

  await connectDb();
  await AssetModel.findByIdAndUpdate(assetId, {
    name,
    brand,
    model,
    category,
    serialNumber,
    purchaseDate,
    purchasePrice,
    condition,
    notes,
  });

  revalidatePath("/dashboard/assets");
  return { success: "Asset details updated." };
}

export async function returnAsset(_prev: AssetState, formData: FormData): Promise<AssetState> {
  const session = await getCurrentSession();
  try { assertAdminOrManager(session); } catch { return { error: "Only admin can manage assets." }; }

  const assetId   = String(formData.get("assetId") ?? "").trim();
  const newStatus = String(formData.get("newStatus") ?? "RETURNED").trim();
  const fineAmount = parseFloat(String(formData.get("fineAmount") ?? "0"));
  const fineNote   = String(formData.get("fineNote") ?? "").trim();

  if (!assetId) return { error: "Asset is required." };

  await connectDb();
  await AssetModel.findByIdAndUpdate(assetId, {
    status: newStatus === "AVAILABLE" ? "AVAILABLE" : newStatus,
    assignedToUserId: "",
    assignedToName: "",
    returnedAt: new Date(),
    fineAmount: (newStatus === "LOST" || newStatus === "DAMAGED") && !isNaN(fineAmount) ? fineAmount : 0,
    fineNote:   (newStatus === "LOST" || newStatus === "DAMAGED") ? fineNote : "",
  });

  revalidatePath("/dashboard/assets");
  return { success: "Asset updated successfully." };
}

export async function deleteAsset(_prev: AssetState, formData: FormData): Promise<AssetState> {
  const session = await getCurrentSession();
  try { assertAdminOrManager(session); } catch { return { error: "Only admin can delete assets." }; }

  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) return { error: "Asset is required." };

  await connectDb();
  await AssetModel.findByIdAndDelete(assetId);

  revalidatePath("/dashboard/assets");
  return { success: "Asset deleted." };
}
