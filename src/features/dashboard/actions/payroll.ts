"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertSuperAdmin } from "@/features/auth/lib/user-admin";
import connectDb from "@/database/mongodb/connect";
import { SalaryModel } from "@/database/mongodb/models/workforce/salary";
import { PayslipModel } from "@/database/mongodb/models/workforce/payslip";
import { AttendanceModel } from "@/database/mongodb/models/workforce/attendance";
import { LeaveRequestModel } from "@/database/mongodb/models/workforce/leave-request";
import { UserModel } from "@/database/mongodb/models/workforce/user";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";
import { headers } from "next/headers";

type SalaryState = { error?: string; success?: string };

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

  const [year, month] = monthKey.split("-").map(Number);
  const startDate = `${monthKey}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = `${monthKey}-${String(endDate.getDate()).padStart(2, "0")}`;

  const attendance = await AttendanceModel.find({
    userId,
    dateKey: { $gte: startDate, $lte: endDateStr },
  }).lean();

  const presentDays = attendance.filter((a) => a.status === "COMPLETED").length;
  const lateDays = attendance.filter((a) => a.isLate).length;

  const approvedLeaves = await LeaveRequestModel.find({
    userId,
    status: "APPROVED",
    $or: [{ startDate: { $gte: startDate, $lte: endDateStr } }, { endDate: { $gte: startDate, $lte: endDateStr } }],
  }).lean();

  const leaveDays = approvedLeaves.reduce((acc, l) => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    return acc + Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  }, 0);

  const grossSalary = salary.basicSalary + salary.hra + salary.transportAllowance + salary.medicalAllowance + salary.otherAllowances;
  const perDaySalary = grossSalary / workingDays;
  const leaveDeduction = leaveDays > 0 ? Math.round(perDaySalary * leaveDays) : 0;
  const lateDeduction = lateDays > 1 ? Math.round(perDaySalary * Math.floor(lateDays / 3)) : 0;
  const totalDeductions = salary.tds + salary.providentFund + salary.otherDeductions + leaveDeduction + lateDeduction;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

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
      leaveDeduction,
      lateDays,
      lateDeduction,
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

export async function markPayslipPaid(_prev: SalaryState, formData: FormData): Promise<SalaryState> {
  const session = await getCurrentSession();
  assertSuperAdmin(session);

  const payslipId = String(formData.get("payslipId") ?? "").trim();
  const paidOn = String(formData.get("paidOn") ?? "").trim();

  if (!payslipId || !paidOn) return { error: "Payslip and payment date are required." };

  await connectDb();

  const payslip = await PayslipModel.findByIdAndUpdate(payslipId, { status: "PAID", paidOn }, { new: true }).lean();
  if (!payslip) return { error: "Payslip not found." };

  revalidatePath("/dashboard/payroll");
  return { success: "Payslip marked as paid." };
}
