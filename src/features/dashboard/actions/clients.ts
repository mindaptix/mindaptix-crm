"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { SalesCustomerModel } from "@/database/mongodb/models/sales-customer";
import { ProjectModel } from "@/database/mongodb/models/project";

type ClientState = { error?: string; success?: string };

export async function createClient(_previous: ClientState, formData: FormData): Promise<ClientState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return { error: "Only the Super Admin can manage clients." };
  const clientName = String(formData.get("clientName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();
  const country = String(formData.get("country") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (clientName.length < 2 || !projectId) return { error: "Client name and linked project are required." };
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return { error: "Enter a valid client email." };
  await connectDb();
  if (!await ProjectModel.exists({ _id: projectId })) return { error: "Select a valid project." };
  await SalesCustomerModel.create({ salesUserId: session.user.id, clientName, companyName, clientPhone, clientEmail, country, projectId, status: "ACTIVE" });
  revalidatePath("/dashboard/clients");
  return { success: "Client added." };
}

export async function deleteClient(_previous: ClientState, formData: FormData): Promise<ClientState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return { error: "Only the Super Admin can delete clients." };
  await connectDb();
  const result = await SalesCustomerModel.findByIdAndDelete(String(formData.get("clientId") ?? "").trim());
  if (!result) return { error: "Client not found." };
  revalidatePath("/dashboard/clients");
  return { success: "Client deleted." };
}
