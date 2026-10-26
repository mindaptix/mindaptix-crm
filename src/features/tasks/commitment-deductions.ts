import "server-only";
import connectDb from "@/database/mongodb/connect";
import { TaskCommitmentModel } from "@/database/mongodb/models/operations/task-commitment";
import { TaskModel } from "@/database/mongodb/models/task";
import { SalaryAdjustmentModel } from "@/database/mongodb/models/workforce/salary-adjustment";
import { PayslipModel } from "@/database/mongodb/models/workforce/payslip";
import { formatIndiaDateKey } from "@/shared/lib/india-time";
import { fridayEndInstant, shouldDeductForCommitment } from "@/features/tasks/commitment-policy";

export async function applyCommitmentDeductions(now = new Date()) {
  await connectDb();
  await SalaryAdjustmentModel.init();
  const today = formatIndiaDateKey(now);
  const commitments = await TaskCommitmentModel.find({ answer: "YES", friday: { $lt: today } }).sort({ friday: 1, createdAt: 1 }).lean();
  let added = 0;
  let skipped = 0;
  for (const commitment of commitments) {
    const task = await TaskModel.findById(commitment.taskId).lean();
    const cutoff = fridayEndInstant(commitment.friday);
    if (!task || task.assignedUserId !== commitment.userId || !shouldDeductForCommitment(task, cutoff)) { skipped++; continue; }
    const monthKey = commitment.friday.slice(0, 7);
    if (await PayslipModel.exists({ userId: commitment.userId, monthKey, status: "PAID" })) { skipped++; continue; }
    const sourceKey = `commitment-missed:${commitment.taskId}`;
    const reason = `Task "${task.title}" was confirmed for ${commitment.promisedDate} and remained incomplete at the end of Friday ${commitment.friday}.`;
    try {
      const result = await SalaryAdjustmentModel.updateOne({ sourceKey }, { $setOnInsert: { userId: commitment.userId, monthKey, kind: "DEDUCTION", amount: 200, reason, effectiveDate: commitment.friday, sourceKey, createdByUserId: "system" } }, { upsert: true });
      added += result.upsertedCount;
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) throw error;
    }
    await PayslipModel.updateOne({ userId: commitment.userId, monthKey, status: "GENERATED", "manualDeductionDetails.sourceKey": { $ne: sourceKey } }, { $set: { adjustmentsPending: true } });
  }
  return { checked: commitments.length, added, skipped };
}
