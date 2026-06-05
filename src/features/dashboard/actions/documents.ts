"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { EmployeeDocumentModel, DOCUMENT_TYPES } from "@/database/mongodb/models/workforce/employee-document";
import { saveUploadedFile } from "@/shared/storage/uploads/shared";

type DocumentState = { error?: string; success?: string };

const MAX_DOCUMENT_UPLOAD_MB = 25;
const MAX_DOCUMENT_UPLOAD_BYTES = MAX_DOCUMENT_UPLOAD_MB * 1024 * 1024;

export async function uploadEmployeeDocument(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const session = await getCurrentSession();
  if (!session) return { error: "Please sign in again." };

  const targetUserId   = String(formData.get("targetUserId") ?? "").trim();
  const documentType   = String(formData.get("documentType") ?? "").trim();
  const note           = String(formData.get("note") ?? "").trim();
  const expiryDate     = String(formData.get("expiryDate") ?? "").trim();
  const file           = formData.get("file");

  const isAdminOrManager = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  const resolvedUserId   = isAdminOrManager && targetUserId ? targetUserId : session.user.id;

  if (!DOCUMENT_TYPES.includes(documentType as never)) {
    return { error: "Select a valid document type." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please select a file to upload." };
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return { error: `File must be under ${MAX_DOCUMENT_UPLOAD_MB} MB.` };
  }

  await connectDb();

  const saved = await saveUploadedFile(file, "employee-documents");
  if (!saved) return { error: "File upload failed. Please try again." };

  await EmployeeDocumentModel.create({
    userId: resolvedUserId,
    documentType,
    fileName: saved.fileName,
    fileUrl: saved.fileUrl,
    note,
    expiryDate: expiryDate || null,
    uploadedByUserId: session.user.id,
  });

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${resolvedUserId}`);
  revalidatePath("/dashboard/settings");
  return { success: "Document uploaded successfully." };
}

export async function deleteEmployeeDocument(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const session = await getCurrentSession();
  if (!session) return { error: "Please sign in again." };

  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) return { error: "Document ID is required." };

  await connectDb();

  const doc = await EmployeeDocumentModel.findById(documentId).lean();
  if (!doc) return { error: "Document not found." };

  const isAdminOrManager = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";
  const isOwner = doc.userId === session.user.id;

  if (!isAdminOrManager && !isOwner) {
    return { error: "You do not have permission to delete this document." };
  }

  await EmployeeDocumentModel.findByIdAndDelete(documentId);

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${doc.userId}`);
  revalidatePath("/dashboard/settings");
  return { success: "Document deleted." };
}
