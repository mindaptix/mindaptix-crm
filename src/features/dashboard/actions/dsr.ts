"use server";

import { randomUUID } from "node:crypto";
import { parseGithubRepository, validGithubUsername, validGithubBranch, workDateWindow } from "@/features/dsr-review/validation";
import { formatIndiaDateKey } from "@/shared/lib/india-time";
import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { getAdminUserIds, createNotificationsForUsers } from "@/features/notifications/service";
import { DailyUpdateModel } from "@/database/mongodb/models/daily-update";
import { UserModel } from "@/database/mongodb/models/user";
import { saveDsrAttachments } from "@/shared/storage/uploads/work-attachments";

type DailyUpdateState = {
  error?: string;
  success?: string;
  values?: {
    summary?: string;
    accomplishments?: string;
    blockers?: string;
    nextPlan?: string;
    projectId?: string;
    workDate?: string;
    githubRepoUrl?: string;
    githubUsername?: string;
    githubBranch?: string;
  };
};

export async function submitDailyUpdate(
  _previousState: DailyUpdateState,
  formData: FormData,
): Promise<DailyUpdateState> {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Authentication required." };
  }

  if (session.user.role !== "EMPLOYEE") {
    return { error: "Only employees can submit daily updates." };
  }

  const summary = String(formData.get("summary") ?? "").trim();
  const accomplishments = String(formData.get("accomplishments") ?? "").trim();
  const blockers = String(formData.get("blockers") ?? "").trim();
  const nextPlan = String(formData.get("nextPlan") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const workDate = String(formData.get("workDate") ?? "").trim();
  const githubRepoUrl = String(formData.get("githubRepoUrl") ?? "").trim();
  const githubUsername = String(formData.get("githubUsername") ?? "").trim();
  const githubBranch = String(formData.get("githubBranch") ?? "").trim();
  const values = { summary, accomplishments, blockers, nextPlan, projectId, workDate, githubRepoUrl, githubUsername, githubBranch };
  const attachmentFiles = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const hasGithubEvidence = Boolean(githubRepoUrl || githubUsername || githubBranch);
  const repo = hasGithubEvidence ? parseGithubRepository(githubRepoUrl) : null;
  if (hasGithubEvidence && (!repo || !validGithubUsername(githubUsername) || !validGithubBranch(githubBranch))) {
    return { error: "For GitHub verification, enter a valid repository link, your GitHub username and an optional valid branch.", values };
  }
  const screenshotFiles = attachmentFiles.filter((file) => file.type.startsWith("image/"));
  if (!repo && screenshotFiles.length === 0) {
    return { error: "Add GitHub repository evidence or upload at least one work screenshot before submitting the DSR.", values };
  }
  try { workDateWindow(workDate); } catch { return { error: "Choose a valid work date.", values }; }
  if (workDate > formatIndiaDateKey()) return { error: "Work date cannot be in the future.", values };
  if (summary.length < 6 || summary.length > 200) {
    return {
      error: "Update title must be between 6 and 200 characters.",
      values,
    };
  }

  if (accomplishments.length < 8 || accomplishments.length > 1200) {
    return {
      error: "Work details must be between 8 and 1200 characters.",
      values,
    };
  }

  if (blockers.length > 600 || nextPlan.length > 600) return { error: "Blockers and tomorrow's plan must each be 600 characters or fewer.", values };

  if (projectId && !session.user.projectIds.includes(projectId)) {
    return {
      error: "You can only submit updates for projects assigned to you.",
      values,
    };
  }

  await connectDb();
  const attachments = await saveDsrAttachments(attachmentFiles);

  await DailyUpdateModel.findOneAndUpdate(
    { userId: session.user.id, workDate },
    {
      userId: session.user.id,
      projectId,
      workDate,
      summary,
      accomplishments,
      blockers,
      nextPlan,
      attachments,
      githubRepoUrl: repo?.url ?? "",
      githubUsername: repo ? githubUsername : "",
      githubBranch: repo ? githubBranch : "",
      reviewRevision: randomUUID(),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const managerId = String(session.user.managerId ?? "").trim();
  const reportingManager =
    managerId && isValidObjectId(managerId)
      ? await UserModel.findById(managerId, { _id: 1, status: 1 }).lean()
      : null;
  const adminRecipients = await getAdminUserIds();
  const recipients = Array.from(
    new Set([
    ...(reportingManager?.status === "ACTIVE" ? [reportingManager._id.toString()] : []),
    ...adminRecipients,
    ]),
  );
  await createNotificationsForUsers(recipients, {
    actorUserId: session.user.id,
    type: "DSR_SUBMITTED",
    title: "DSR submitted",
    message: `${session.user.fullName} submitted the DSR for ${workDate}.`,
    actionUrl: "/dashboard/dsr",
    sourceKey: `dsr-submitted:${session.user.id}:${workDate}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dsr");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/reports");

  return {
    success: "Daily update saved.",
    values: { workDate, projectId, githubRepoUrl: repo?.url ?? "", githubUsername: repo ? githubUsername : "", githubBranch: repo ? githubBranch : "" },
  };
}


