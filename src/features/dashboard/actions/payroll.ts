"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertSuperAdmin } from "@/features/auth/lib/user-admin";
import connectDb from "@/database/mongodb/connect";
import { SalaryModel } from "@/database/mongodb/models/workforce/salary";
import { PayslipModel } from "@/database/mongodb/models/workforce/payslip";
import { SalaryAdjustmentModel } from "@/database/mongodb/models/workforce/salary-adjustment";
import { AttendanceModel } from "@/database/mongodb/models/workforce/attendance";
import { LeaveRequestModel } from "@/database/mongodb/models/workforce/leave-request";
import { UserModel } from "@/database/mongodb/models/workforce/user";
import { HolidayModel } from "@/database/mongodb/models/system/holiday";
import { RewardClaimModel } from "@/database/mongodb/models/workforce/reward-claim";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";
import { headers } from "next/headers";
import { COMPANY_WORK_POLICY, mergeCompanyHolidays } from "@/features/dashboard/lib/work-calendar";
import { formatIndiaDateKey, formatIndiaTimeKey } from "@/shared/lib/india-time";
import { getSalaryDeductionStart } from "@/features/payroll/deduction-policy";
import { calculateManualPayroll } from "@/features/payroll/manual-payroll";

type SalaryState = { error?: string; success?: string };

export async function addManualDeduction(_prev: SalaryState, formData: FormData): Promise<SalaryState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);
  const userId = String(formData.get("userId") ?? "").trim();
  const effectiveDate = String(formData.get("effectiveDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const date = new Date(`${effectiveDate}T00:00:00.000Z`);
  if (!mongoose.isValidObjectId(userId) || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== effectiveDate || !Number.isFinite(amount) || amount < 0 || amount > 10000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 || reason.length < 5 || reason.length > 500) {
    return { error: "Select an employee and a valid date, amount and reason (5–500 characters)." };
  }
  await connectDb();
  const employee = await UserModel.findOne({ _id: userId, role: { $in: ["EMPLOYEE", "MANAGER"] }, status: "ACTIVE" }, { fullName: 1 }).lean();
  if (!employee) return { error: "Active employee not found." };
  const monthKey = effectiveDate.slice(0, 7);
  const existingPayslip = await PayslipModel.findOne({ userId, monthKey }, { status: 1 }).lean();
  if (existingPayslip?.status === "PAID") return { error: "This month's payslip is already paid. Use a different month for the adjustment." };
  await SalaryAdjustmentModel.create({ userId, monthKey, kind: "DEDUCTION", amount, reason, effectiveDate, sourceKey: `manual-deduction:${randomUUID()}`, createdByUserId: session.user.id });
  await PayslipModel.updateOne({ userId, monthKey, status: "GENERATED" }, { $set: { adjustmentsPending: true } });
  const headerStore = await headers();
  await AuditLogModel.create({ actorUserId: session.user.id, actorName: session.user.fullName, actorRole: session.user.role, action: "SALARY_ADJUSTMENT_ADDED", targetUserId: userId, targetName: employee.fullName, detail: `₹${amount} deduction on ${effectiveDate}: ${reason}`.slice(0, 500), ipAddress: headerStore.get("x-forwarded-for") ?? "" });
  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard/salary");
  return { success: `Deduction added for ${employee.fullName}.${existingPayslip ? " Regenerate the existing payslip to apply it." : ""}` };
}

export async function setSalaryStructure(_prev: SalaryState, formData: FormData): Promise<SalaryState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);

  const userId = String(formData.get("userId") ?? "").trim();
  const basicSalary = Number(formData.get("basicSalary") ?? 0);
  const hra = Number(formData.get("hra") ?? 0);
  const transportAllowance = Number(formData.get("transportAllowance") ?? 0);
  const medicalAllowance = Number(formData.get("medicalAllowance") ?? 0);
  const otherAllowances = Number(formData.get("otherAllowances") ?? 0);
  const tds = Number(formData.get("tds") ?? 0);
  const providentFund = Number(formData.get("providentFund") ?? 0);
  const otherDeductions = Number(formData.get("otherDeductions") ?? 0);
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!userId || basicSalary < 0 || !effectiveFrom) {
    return { error: "Employee, salary amount and effective date are required." };
  }

  await connectDb();

  const employee = await UserModel.findById(userId, { fullName: 1 }).lean();
  if (!employee) return { error: "Employee not found." };

  await SalaryModel.updateMany({ userId, status: "ACTIVE" }, { $set: { status: "REVISED" } });

  await SalaryModel.create({
    userId,
    basicSalary,
    hra,
    transportAllowance,
    medicalAllowance,
    otherAllowances,
    tds,
    providentFund,
    otherDeductions,
    effectiveFrom,
    status: "ACTIVE",
    note,
    createdByUserId: session.user.id,
  });

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "SALARY_SET",
    targetUserId: userId,
    targetName: employee.fullName,
    detail: `Basic salary set to ₹${basicSalary.toLocaleString("en-IN")} effective ${effectiveFrom}`,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/payroll");
  return { success: `Salary structure updated for ${employee.fullName}.` };
}

export async function generatePayslip(_prev: SalaryState, formData: FormData): Promise<SalaryState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);

  const userId = String(formData.get("userId") ?? "").trim();
  const monthKey = String(formData.get("monthKey") ?? "").trim();
  const workingDays = Number(formData.get("workingDays") ?? 26);
  const note = String(formData.get("note") ?? "").trim();

  if (!userId || !monthKey) return { error: "Employee and month are required." };

  await connectDb();

  const employee = await UserModel.findById(userId, { fullName: 1 }).lean();
  if (!employee) return { error: "Employee not found." };

  const salary = await SalaryModel.findOne({ userId, status: "ACTIVE" }).lean();
  if (!salary) return { error: "No active salary structure found for this employee. Set salary first." };
  const existingPayslip = await PayslipModel.findOne({ userId, monthKey }, { status: 1 }).lean();
  if (existingPayslip?.status === "PAID") return { error: "A paid payslip cannot be regenerated." };

  const [year, month] = monthKey.split("-").map(Number);
  const startDate = `${monthKey}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = `${monthKey}-${String(endDate.getDate()).padStart(2, "0")}`;

  const today = formatIndiaDateKey();
  const calculationEndDate = monthKey === today.slice(0, 7)
    ? (formatIndiaTimeKey() >= "19:00" ? today : addDaysToDate(today, -1))
    : endDateStr;
  const [attendance, holidays, approvedRewards, manualDeductions] = await Promise.all([
    AttendanceModel.find({ userId, dateKey: { $gte: startDate, $lte: endDateStr } }).lean(),
    HolidayModel.find({ date: { $gte: startDate, $lte: calculationEndDate } }, { date: 1 }).lean(),
    RewardClaimModel.find({ userId, rewardMonthKey: monthKey, status: "APPROVED" }, { amount: 1 }).lean(),
    SalaryAdjustmentModel.find({ userId, monthKey, kind: "DEDUCTION" }).lean(),
  ]);

  const presentDays = attendance.filter((a) => a.status === "COMPLETED" || a.status === "PRESENT").length;
  const lateDays = attendance.filter((a) => a.isLate).length;

  const approvedLeaves = await LeaveRequestModel.find({
    userId,
    status: "APPROVED",
    $or: [{ startDate: { $gte: startDate, $lte: endDateStr } }, { endDate: { $gte: startDate, $lte: endDateStr } }],
  }).lean();

  const grossSalary = salary.basicSalary + salary.hra + salary.transportAllowance + salary.medicalAllowance + salary.otherAllowances;
  const holidayDates = mergeCompanyHolidays(holidays.map((holiday) => ({ date: holiday.date }))).map((holiday) => holiday.date);
  const deductionStart = getSalaryDeductionStart(startDate);
  const deductionDates = calculationEndDate >= deductionStart ? getWorkingDateKeys(deductionStart, calculationEndDate, holidayDates) : [];
  const presentDateKeys = new Set(attendance.filter((row) => (row.status === "COMPLETED" || row.status === "PRESENT") && row.dateKey >= deductionStart && row.dateKey <= calculationEndDate).map((row) => row.dateKey));
  const leaveDateKeys = new Set(approvedLeaves.flatMap((leave) => getWorkingDateKeys(leave.startDate < deductionStart ? deductionStart : leave.startDate, leave.endDate > calculationEndDate ? calculationEndDate : leave.endDate, holidayDates)));
  const leaveDays = leaveDateKeys.size;
  const absentDays = deductionDates.filter((dateKey) => !presentDateKeys.has(dateKey) && !leaveDateKeys.has(dateKey)).length;
  const rewardAmount = approvedRewards.reduce((sum, reward) => sum + reward.amount, 0);
  const manualDeduction = manualDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  const { totalDeductions, netSalary } = calculateManualPayroll(grossSalary, salary.tds + salary.providentFund + salary.otherDeductions, manualDeduction, rewardAmount);

  await PayslipModel.findOneAndUpdate(
    { userId, monthKey },
    {
      userId,
      monthKey,
      basicSalary: salary.basicSalary,
      hra: salary.hra,
      transportAllowance: salary.transportAllowance,
      medicalAllowance: salary.medicalAllowance,
      otherAllowances: salary.otherAllowances,
      grossSalary,
      tds: salary.tds,
      providentFund: salary.providentFund,
      leaveDays,
      leaveDeduction: 0,
      absentDays,
      absentDeduction: 0,
      lateDays,
      lateDeduction: 0,
      overdueTaskDays: 0,
      overdueTaskDeduction: 0,
      rewardAmount,
      manualDeduction,
      manualDeductionDetails: manualDeductions.map((deduction) => ({ effectiveDate: deduction.effectiveDate, reason: deduction.reason, amount: deduction.amount, sourceKey: deduction.sourceKey })),
      adjustmentsPending: false,
      otherDeductions: salary.otherDeductions,
      totalDeductions,
      netSalary,
      presentDays,
      workingDays,
      status: "GENERATED",
      note,
      generatedByUserId: session.user.id,
    },
    { upsert: true, new: true },
  );

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "PAYSLIP_GENERATED",
    targetUserId: userId,
    targetName: employee.fullName,
    detail: `Payslip generated for ${monthKey}, net ₹${netSalary.toLocaleString("en-IN")}`,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/payroll");
  return { success: `Payslip generated for ${employee.fullName} — ${monthKey}.` };
}

function addDaysToDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWorkingDateKeys(startDate: string, endDate: string, holidayDates: Iterable<string>) {
  if (endDate < startDate) return [];
  const holidays = new Set(holidayDates);
  const dates: string[] = [];
  for (const cursor = new Date(`${startDate}T00:00:00.000Z`); cursor.toISOString().slice(0, 10) <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dateKey = cursor.toISOString().slice(0, 10);
    if (!COMPANY_WORK_POLICY.weeklyOffDays.includes(cursor.getUTCDay() as 0 | 6) && !holidays.has(dateKey)) dates.push(dateKey);
  }
  return dates;
}

export async function markPayslipPaid(_prev: SalaryState, formData: FormData): Promise<SalaryState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);

  const payslipId = String(formData.get("payslipId") ?? "").trim();
  const paidOn = String(formData.get("paidOn") ?? "").trim();

  if (!payslipId || !paidOn) return { error: "Payslip and payment date are required." };

  await connectDb();

  const payslip = await PayslipModel.findOneAndUpdate({ _id: payslipId, status: "GENERATED", adjustmentsPending: { $ne: true } }, { status: "PAID", paidOn }, { new: true }).lean();
  if (!payslip) return { error: "Payslip not found, already paid, or needs regeneration to include new adjustments." };

  revalidatePath("/dashboard/payroll");
  return { success: "Payslip marked as paid." };
}
