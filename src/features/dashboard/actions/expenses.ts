"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { ExpenseModel } from "@/database/mongodb/models/workforce/expense";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";
import { headers } from "next/headers";

type ExpenseState = { error?: string; success?: string };

export async function submitExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const session = await getCurrentSession();
  if (!session) return { error: "Please sign in." };

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const receiptUrl = String(formData.get("receiptUrl") ?? "").trim();
  const receiptName = String(formData.get("receiptName") ?? "").trim();

  if (!title || !category || amount < 1 || !expenseDate) {
    return { error: "Title, category, amount and date are required." };
  }

  await connectDb();
  await ExpenseModel.create({
    userId: session.user.id,
    title,
    category,
    amount,
    expenseDate,
    description,
    receiptUrl,
    receiptName,
    status: "PENDING",
  });

  revalidatePath("/dashboard/expenses");
  return { success: "Expense claim submitted successfully." };
}

export async function reviewExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const session = await getCurrentSession();
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { error: "Only managers can review expenses." };
  }

  const expenseId = String(formData.get("expenseId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as "APPROVED" | "REJECTED";
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!expenseId || !["APPROVED", "REJECTED"].includes(action)) {
    return { error: "Invalid request." };
  }

  await connectDb();
  const expense = await ExpenseModel.findByIdAndUpdate(
    expenseId,
    {
      status: action,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewNote,
    },
    { new: true },
  ).lean();

  if (!expense) return { error: "Expense not found." };

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: action === "APPROVED" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED",
    targetUserId: expense.userId,
    targetName: expense.title,
    detail: reviewNote,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/expenses");
  return { success: `Expense ${action.toLowerCase()} successfully.` };
}

export async function markExpensePaid(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return { error: "Only Super Admin can mark expenses paid." };

  const expenseId = String(formData.get("expenseId") ?? "").trim();
  const paidOn = String(formData.get("paidOn") ?? "").trim();

  if (!expenseId || !paidOn) return { error: "Expense ID and paid date required." };

  await connectDb();
  const expense = await ExpenseModel.findByIdAndUpdate(expenseId, { status: "PAID", paidOn }, { new: true }).lean();
  if (!expense) return { error: "Expense not found." };

  revalidatePath("/dashboard/expenses");
  return { success: "Expense marked as paid." };
}
