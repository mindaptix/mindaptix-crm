import { taskDeadline } from "@/features/tasks/deadline";
import { COMPANY_WORK_POLICY } from "@/features/dashboard/lib/work-calendar";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export const TASK_OVERDUE_GRACE_WORKDAYS = 2;
export const TASK_OVERDUE_DEDUCTION_PER_DAY = 200;

type DeductionTask = {
  dueDate: string;
  deadlineAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  status: string;
};

type OverdueDeductionOptions = {
  tasks: DeductionTask[];
  periodStart: string;
  periodEnd: string;
  holidayDates: Iterable<string>;
};

/**
 * Counts only company working days. The first two overdue working days are a
 * grace period; each following day costs ₹200 for each task until it is closed.
 */
export function calculateTaskOverdueDeduction({ tasks, periodStart, periodEnd, holidayDates }: OverdueDeductionOptions) {
  const holidays = new Set(holidayDates);
  let chargeableTaskDays = 0;
  let affectedTasks = 0;

  for (const task of tasks) {
    const deadline = taskDeadline(task);
    if (!deadline) continue;

    const deadlineDate = formatIndiaDateKey(deadline);
    const closedDate = task.status === "CLOSED" && task.reviewedAt
      ? formatIndiaDateKey(task.reviewedAt)
      : periodEnd;
    const finalDate = closedDate < periodEnd ? closedDate : periodEnd;
    if (finalDate <= deadlineDate) continue;

    let overdueWorkdays = 0;
    let taskChargeableDays = 0;
    const cursor = new Date(`${deadlineDate}T00:00:00.000Z`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);

    while (cursor.toISOString().slice(0, 10) <= finalDate) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const isWeeklyOff = COMPANY_WORK_POLICY.weeklyOffDays.includes(cursor.getUTCDay() as 0 | 6);
      if (!isWeeklyOff && !holidays.has(dateKey)) {
        overdueWorkdays += 1;
        if (overdueWorkdays > TASK_OVERDUE_GRACE_WORKDAYS && dateKey >= periodStart) {
          taskChargeableDays += 1;
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (taskChargeableDays > 0) {
      affectedTasks += 1;
      chargeableTaskDays += taskChargeableDays;
    }
  }

  return {
    affectedTasks,
    chargeableTaskDays,
    deduction: chargeableTaskDays * TASK_OVERDUE_DEDUCTION_PER_DAY,
  };
}
