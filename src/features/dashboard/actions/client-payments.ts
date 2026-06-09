"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { assertAdminOrManager } from "@/features/auth/lib/user-admin";
import connectDb from "@/database/mongodb/connect";
import {
  SALES_PAYMENT_STATUSES,
  SalesPaymentModel,
  type SalesPaymentStatus,
} from "@/database/mongodb/models/sales-payment";

export type ClientPaymentFormState = {
  error?: string;
  success?: string;
  values?: {
    id?: string;
    clientName?: string;
    projectName?: string;
    invoiceNumber?: string;
    amount?: string;
    receivedAmount?: string;
    dueDate?: string;
    receivedDate?: string;
    status?: string;
    note?: string;
    isRecurring?: string;
    recurringDayOfMonth?: string;
    recurringEndDate?: string;
  };
};

function safeStatus(value: string): SalesPaymentStatus {
  return SALES_PAYMENT_STATUSES.includes(value as SalesPaymentStatus)
    ? (value as SalesPaymentStatus)
    : "PENDING";
}

export async function createClientPayment(
  _previousState: ClientPaymentFormState,
  formData: FormData,
): Promise<ClientPaymentFormState> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin or manager can create payment records." };
  }

  const clientName = String(formData.get("clientName") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "0").trim();
  const receivedAmountStr = String(formData.get("receivedAmount") ?? "0").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const receivedDate = String(formData.get("receivedDate") ?? "").trim();
  const status = String(formData.get("status") ?? "PENDING");
  const note = String(formData.get("note") ?? "").trim();
  const isRecurring = formData.get("isRecurring") === "true";
  const recurringDayStr = String(formData.get("recurringDayOfMonth") ?? "").trim();
  const recurringEndDate = String(formData.get("recurringEndDate") ?? "").trim();

  if (!clientName || clientName.length < 2) {
    return {
      error: "Client name is required (at least 2 characters).",
      values: { clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note, isRecurring: String(isRecurring), recurringDayOfMonth: recurringDayStr, recurringEndDate },
    };
  }

  if (!projectName || projectName.length < 2) {
    return {
      error: "Project name is required (at least 2 characters).",
      values: { clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note, isRecurring: String(isRecurring), recurringDayOfMonth: recurringDayStr, recurringEndDate },
    };
  }

  const amount = Number(amountStr);
  const receivedAmount = Number(receivedAmountStr);

  if (isNaN(amount) || amount < 0) {
    return {
      error: "Total amount must be a valid positive number.",
      values: { clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note, isRecurring: String(isRecurring), recurringDayOfMonth: recurringDayStr, recurringEndDate },
    };
  }

  if (isNaN(receivedAmount) || receivedAmount < 0) {
    return {
      error: "Received amount must be a valid positive number.",
      values: { clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note, isRecurring: String(isRecurring), recurringDayOfMonth: recurringDayStr, recurringEndDate },
    };
  }

  if (receivedAmount > amount) {
    return {
      error: "Received amount cannot be greater than total amount.",
      values: { clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note, isRecurring: String(isRecurring), recurringDayOfMonth: recurringDayStr, recurringEndDate },
    };
  }

  // Validate recurring day
  let recurringDayOfMonth: number | null = null;
  if (isRecurring) {
    recurringDayOfMonth = recurringDayStr ? Number(recurringDayStr) : null;
    if (!recurringDayOfMonth || isNaN(recurringDayOfMonth) || recurringDayOfMonth < 1 || recurringDayOfMonth > 28) {
      return {
        error: "Recurring billing day must be between 1 and 28.",
        values: { clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note, isRecurring: "true", recurringDayOfMonth: recurringDayStr, recurringEndDate },
      };
    }
  }

  // Auto-compute status if not explicitly set
  let computedStatus: SalesPaymentStatus = safeStatus(status);
  if (amount > 0) {
    if (receivedAmount >= amount) computedStatus = "PAID";
    else if (receivedAmount > 0) computedStatus = "PARTIAL";
    else if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) computedStatus = "OVERDUE";
    else computedStatus = "PENDING";
  }

  await connectDb();

  await SalesPaymentModel.create({
    salesUserId: session.user.id,
    clientName,
    projectName,
    invoiceNumber,
    amount,
    receivedAmount,
    dueDate,
    receivedDate,
    status: computedStatus,
    note,
    isRecurring,
    recurringDayOfMonth,
    recurringEndDate,
    recurringParentId: "",
    recurringLastGenerated: "",
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");

  return {
    success: "Payment record created successfully.",
    values: { clientName: "", projectName: "", invoiceNumber: "", amount: "0", receivedAmount: "0", dueDate: "", receivedDate: "", status: "PENDING", note: "", isRecurring: "false", recurringDayOfMonth: "", recurringEndDate: "" },
  };
}

export async function updateClientPayment(
  _previousState: ClientPaymentFormState,
  formData: FormData,
): Promise<ClientPaymentFormState> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin or manager can update payment records." };
  }

  const id = String(formData.get("paymentId") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "0").trim();
  const receivedAmountStr = String(formData.get("receivedAmount") ?? "0").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const receivedDate = String(formData.get("receivedDate") ?? "").trim();
  const status = String(formData.get("status") ?? "PENDING");
  const note = String(formData.get("note") ?? "").trim();

  if (!id) {
    return { error: "Payment record ID is required." };
  }

  if (!clientName || clientName.length < 2) {
    return {
      error: "Client name is required (at least 2 characters).",
      values: { id, clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note },
    };
  }

  if (!projectName || projectName.length < 2) {
    return {
      error: "Project name is required (at least 2 characters).",
      values: { id, clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note },
    };
  }

  const amount = Number(amountStr);
  const receivedAmount = Number(receivedAmountStr);

  if (isNaN(amount) || amount < 0) {
    return {
      error: "Total amount must be a valid positive number.",
      values: { id, clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note },
    };
  }

  if (isNaN(receivedAmount) || receivedAmount < 0 || receivedAmount > amount) {
    return {
      error: "Received amount must be between 0 and total amount.",
      values: { id, clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note },
    };
  }

  // Auto-compute status
  let computedStatus: SalesPaymentStatus = safeStatus(status);
  if (amount > 0) {
    if (receivedAmount >= amount) computedStatus = "PAID";
    else if (receivedAmount > 0) computedStatus = "PARTIAL";
    else if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) computedStatus = "OVERDUE";
    else computedStatus = "PENDING";
  }

  await connectDb();

  const existing = await SalesPaymentModel.findById(id, { _id: 1 }).lean();

  if (!existing) {
    return { error: "Payment record not found.", values: { id, clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate, status, note } };
  }

  await SalesPaymentModel.findByIdAndUpdate(id, {
    clientName,
    projectName,
    invoiceNumber,
    amount,
    receivedAmount,
    dueDate,
    receivedDate,
    status: computedStatus,
    note,
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");

  return {
    success: "Payment record updated successfully.",
    values: { id, clientName, projectName, invoiceNumber, amount: amountStr, receivedAmount: receivedAmountStr, dueDate, receivedDate: receivedDate, status: computedStatus, note },
  };
}

export async function deleteClientPayment(formData: FormData) {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    throw new Error("Only admin can delete payment records.");
  }

  const paymentId = String(formData.get("paymentId") ?? "").trim();

  if (!paymentId) {
    throw new Error("Payment record ID is required.");
  }

  await connectDb();

  const existing = await SalesPaymentModel.findById(paymentId, { _id: 1 }).lean();

  if (!existing) {
    throw new Error("Payment record not found.");
  }

  await SalesPaymentModel.findByIdAndDelete(paymentId);

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");
}

export async function markPaymentReceived(
  _previousState: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin or manager can update payment records." };
  }

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const receivedAmountStr = String(formData.get("receivedAmount") ?? "").trim();

  if (!paymentId) {
    return { error: "Payment record ID is required." };
  }

  await connectDb();

  const payment = await SalesPaymentModel.findById(paymentId, { amount: 1, status: 1 }).lean();

  if (!payment) {
    return { error: "Payment record not found." };
  }

  const totalAmount = Number(payment.amount ?? 0);
  const receivedAmount = receivedAmountStr ? Number(receivedAmountStr) : totalAmount;

  if (isNaN(receivedAmount) || receivedAmount < 0) {
    return { error: "Invalid received amount." };
  }

  const clamped = Math.min(receivedAmount, totalAmount);
  const today = new Date().toISOString().slice(0, 10);
  const newStatus: SalesPaymentStatus = clamped >= totalAmount ? "PAID" : clamped > 0 ? "PARTIAL" : "PENDING";

  await SalesPaymentModel.findByIdAndUpdate(paymentId, {
    receivedAmount: clamped,
    receivedDate: clamped > 0 ? today : "",
    status: newStatus,
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");

  return { success: newStatus === "PAID" ? "Payment marked as fully paid." : "Partial payment recorded." };
}

// ─── Add installment transaction ────────────────────────────────────────────

export async function addPaymentInstallment(
  _previousState: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const session = await getCurrentSession();

  try {
    assertAdminOrManager(session);
  } catch {
    return { error: "Only admin or manager can record payments." };
  }

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const txAmountStr = String(formData.get("txAmount") ?? "").trim();
  const txDate = String(formData.get("txDate") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!paymentId) return { error: "Payment ID is required." };

  const txAmount = Number(txAmountStr);
  if (!txAmountStr || isNaN(txAmount) || txAmount <= 0) {
    return { error: "Enter a valid amount greater than 0." };
  }

  await connectDb();

  const payment = await SalesPaymentModel.findById(paymentId, { amount: 1, receivedAmount: 1, transactions: 1 }).lean();
  if (!payment) return { error: "Payment record not found." };

  const totalAmount = Number(payment.amount ?? 0);
  const existingReceived = Number(payment.receivedAmount ?? 0);

  // Sum existing transactions + new one
  const existingTxTotal = ((payment as unknown as { transactions?: { txAmount?: number }[] }).transactions ?? [])
    .reduce((sum, t) => sum + Number(t.txAmount ?? 0), 0);
  const newTotal = Math.min(existingTxTotal + txAmount, totalAmount);
  const newStatus: SalesPaymentStatus = newTotal >= totalAmount ? "PAID" : newTotal > 0 ? "PARTIAL" : "PENDING";
  const today = new Date().toISOString().slice(0, 10);

  await SalesPaymentModel.findByIdAndUpdate(paymentId, {
    $push: {
      transactions: {
        txDate: txDate || today,
        txAmount,
        note,
        createdAt: new Date(),
      },
    },
    $set: {
      receivedAmount: newTotal,
      receivedDate: newTotal > 0 ? (txDate || today) : (existingReceived > 0 ? today : ""),
      status: newStatus,
    },
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");

  const remaining = totalAmount - newTotal;
  return {
    success: newStatus === "PAID"
      ? `Payment fully received! ₹${txAmount.toLocaleString("en-IN")} recorded. Project fully paid.`
      : `₹${txAmount.toLocaleString("en-IN")} recorded. Balance remaining: ₹${remaining.toLocaleString("en-IN")}.`,
  };
}
