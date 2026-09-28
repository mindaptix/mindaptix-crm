"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { RewardClaimModel, REWARD_CLAIM_TYPES } from "@/database/mongodb/models/workforce/reward-claim";
import { PayslipModel } from "@/database/mongodb/models/workforce/payslip";
import { UserModel } from "@/database/mongodb/models/user";
import { createNotification, createNotificationsForUsers } from "@/features/notifications/service";
import { formatIndiaDateKey } from "@/shared/lib/india-time";
import { saveUploadedFile } from "@/shared/storage/uploads/shared";

type RewardState = { error?: string; success?: string };

const REWARD_RULES = {
  CLIENT_FEEDBACK: { amount: 200, label: "Client positive feedback" },
  CANDIDATE_REFERRAL: { amount: 1000, label: "Successful candidate referral" },
  PUBLIC_REVIEW: { amount: 500, label: "Google Maps or Upwork review" },
} as const;

export async function submitRewardClaim(_previous: RewardState, formData: FormData): Promise<RewardState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "EMPLOYEE") return { error: "Only employees can submit reward claims." };

  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const proof = formData.get("proof");
  if (!REWARD_CLAIM_TYPES.includes(type as (typeof REWARD_CLAIM_TYPES)[number])) return { error: "Select a valid reward type." };
  if (title.length < 3 || title.length > 180 || details.length < 10 || details.length > 1200) return { error: "Add a title and clear proof details." };
  if (!(proof instanceof File) || proof.size === 0 || !proof.type.startsWith("image/")) return { error: "Upload an image screenshot as proof." };
  if (proof.size > 5 * 1024 * 1024) return { error: "Proof image must be 5 MB or smaller." };

  await connectDb();
  const rewardType = type as keyof typeof REWARD_RULES;
  const savedProof = await saveUploadedFile(proof, "reward-proofs");
  if (!savedProof) return { error: "Could not save the proof image. Please try again." };
  const rule = REWARD_RULES[rewardType];
  const claim = await RewardClaimModel.create({
    userId: session.user.id,
    rewardMonthKey: formatIndiaDateKey().slice(0, 7),
    type: rewardType,
    amount: rule.amount,
    title,
    details,
    proofName: savedProof.fileName,
    proofUrl: savedProof.fileUrl,
    status: "PENDING",
  });
  const admins = await UserModel.find({ role: "SUPER_ADMIN", status: "ACTIVE" }, { _id: 1 }).lean();
  await createNotificationsForUsers(admins.map((admin) => admin._id.toString()), {
    actorUserId: session.user.id,
    type: "REWARD_CLAIM_REQUESTED",
    title: "Reward proof needs review",
    message: `${session.user.fullName} submitted a ${rule.label.toLowerCase()} claim for ₹${rule.amount}.`,
    actionUrl: "/dashboard/earn-more",
    sourceKey: `reward-claim-request:${claim._id.toString()}`,
  });
  revalidatePath("/dashboard/earn-more");
  revalidatePath("/dashboard/salary");
  return { success: `Claim submitted for ₹${rule.amount}. It will be added after Super Admin approval.` };
}

export async function reviewRewardClaim(_previous: RewardState, formData: FormData): Promise<RewardState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can review reward claims." };
  const claimId = String(formData.get("claimId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!claimId || !["APPROVED", "REJECTED"].includes(action)) return { error: "Invalid review request." };

  await connectDb();
  const claim = await RewardClaimModel.findById(claimId).lean();
  if (!claim) return { error: "Reward claim not found." };
  if (claim.status !== "PENDING") return { error: "This reward claim has already been reviewed." };
  await RewardClaimModel.findByIdAndUpdate(claimId, { status: action, reviewedByUserId: session.user.id, reviewedByName: session.user.fullName, reviewNote, reviewedAt: new Date() });
  if (action === "APPROVED") {
    await PayslipModel.findOneAndUpdate(
      { userId: claim.userId, monthKey: claim.rewardMonthKey, status: { $ne: "PAID" } },
      { $inc: { rewardAmount: claim.amount, netSalary: claim.amount } },
    );
  }
  await createNotification({
    recipientUserId: claim.userId,
    actorUserId: session.user.id,
    type: "REWARD_CLAIM_REVIEWED",
    title: action === "APPROVED" ? "Reward claim approved" : "Reward claim declined",
    message: action === "APPROVED" ? `Your ₹${claim.amount} reward will be added to ${claim.rewardMonthKey} salary.` : `Your reward claim was declined${reviewNote ? `: ${reviewNote}` : "."}`,
    actionUrl: "/dashboard/earn-more",
    sourceKey: `reward-claim-review:${claim._id.toString()}:${action}`,
  });
  revalidatePath("/dashboard/earn-more");
  revalidatePath("/dashboard/salary");
  revalidatePath("/dashboard/payroll");
  return { success: action === "APPROVED" ? "Reward approved and added to this month's salary." : "Reward claim rejected." };
}
