"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import connectDb from "@/database/mongodb/connect";
import { ProjectModel } from "@/database/mongodb/models/project";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { parseGithubRepository } from "@/features/dsr-review/validation";

export async function addProjectRepository(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "EMPLOYEE") return { error: "Only assigned employees can add repositories here." };
  const projectId = String(formData.get("projectId") ?? "");
  const repo = parseGithubRepository(String(formData.get("repositoryUrl") ?? "").trim());
  if (!mongoose.isValidObjectId(projectId)) return { error: "Invalid project." };
  if (!repo) return { error: "Enter a valid GitHub repository URL, such as https://github.com/team/app." };
  await connectDb();
  const result = await ProjectModel.updateOne({ _id: projectId, assignedUserIds: session.user.id, archivedAt: null }, { $addToSet: { repositoryUrls: repo.url } });
  if (!result.matchedCount) return { error: "This active project is not assigned to you." };
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/portfolio");
  return { success: result.modifiedCount ? "Repository added." : "This repository is already linked." };
}
