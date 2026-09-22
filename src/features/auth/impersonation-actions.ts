"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { getCurrentSession } from "./lib/auth-session";
import { UserModel } from "@/database/mongodb/models/user";
import { UserSessionModel } from "@/database/mongodb/models/user-session";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";

export async function startEmployeeSession(_state: { error?: string }, data: FormData): Promise<{ error?: string }> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN" || session.impersonator) return { error: "Only a super admin can switch to an employee." };
  const employeeId = String(data.get("employeeId") ?? "");
  if (!isValidObjectId(employeeId)) return { error: "Select an employee." };
  const employee = await UserModel.findOne({ _id: employeeId, role: "EMPLOYEE", status: "ACTIVE" }, { fullName: 1 }).lean();
  if (!employee) return { error: "This employee is not active." };
  await AuditLogModel.create({ actorUserId: session.user.id, actorName: session.user.fullName, actorRole: "SUPER_ADMIN", action: "EMPLOYEE_SESSION_STARTED", targetUserId: employeeId, targetName: employee.fullName, detail: `Employee access for 30 minutes; session ${session.sessionId}` });
  await UserSessionModel.updateOne({ _id: session.sessionId, userId: session.user.id, expiresAt: { $gt: new Date() } }, {
    $set: { impersonatedUserId: employeeId, impersonationExpiresAt: new Date(Date.now() + 30 * 60_000) },
  });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function endEmployeeSession() {
  const session = await getCurrentSession();
  if (!session?.impersonator) redirect("/dashboard");
  await AuditLogModel.create({ actorUserId: session.impersonator.id, actorName: session.impersonator.fullName, actorRole: "SUPER_ADMIN", action: "EMPLOYEE_SESSION_ENDED", targetUserId: session.user.id, targetName: session.user.fullName, detail: `Returned to super admin; session ${session.sessionId}` });
  await UserSessionModel.updateOne({ _id: session.sessionId, userId: session.impersonator.id }, { $set: { impersonatedUserId: null, impersonationExpiresAt: null } });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
