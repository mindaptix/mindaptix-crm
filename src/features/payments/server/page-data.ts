import "server-only";

import connectDb from "@/database/mongodb/connect";
import { ProjectModel } from "@/database/mongodb/models/project";
import { SalesPaymentModel } from "@/database/mongodb/models/sales-payment";
import { UserModel } from "@/database/mongodb/models/user";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { formatIndiaDateKey, formatIndiaDateTime } from "@/shared/lib/india-time";
import type { ClientPaymentEntry, PaymentsPageData } from "../types";
import { linkLegacyPayments } from "./project-mapping";

export async function getPaymentsPageData(session: AuthenticatedSession): Promise<PaymentsPageData> {
  const canManage = session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER";

  await connectDb();
  if (!canManage) throw new Error("Payment access requires admin permissions.");
  await linkLegacyPayments();

  const today = formatIndiaDateKey();

  // Fetch projects for client name / project name suggestions in the payment form
  const projectsForSuggestions = await ProjectModel.find(
    {},
    { name: 1, clientName: 1 },
  ).sort({ name: 1 }).lean();

  // Include ALL named projects — even those without a client name
  const projectSuggestions = projectsForSuggestions
    .filter((p) => Boolean(p.name))
    .map((p) => ({
      id: String(p._id),
      clientName: String((p as unknown as { clientName?: string }).clientName ?? ""),
      projectName: p.name,
    }));

  // Fetch all payment records — admin sees all, no scope filter
  const rawPayments = await SalesPaymentModel.find(
    {},
    { projectId: 1, salesUserId: 1, clientName: 1, projectName: 1, invoiceNumber: 1, amount: 1, receivedAmount: 1, dueDate: 1, receivedDate: 1, status: 1, note: 1, createdAt: 1, transactions: 1, isRecurring: 1, recurringDayOfMonth: 1, recurringEndDate: 1, recurringParentId: 1, recurringLastGenerated: 1 },
  )
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  // Auto-generate this month's entries for recurring payment templates
  const currentYearMonth = today.slice(0, 7); // "YYYY-MM"
  const todayDay = new Date().getDate();
  type RawPayment = typeof rawPayments[number];
  const recurringTemplates = (rawPayments as unknown as (RawPayment & { isRecurring?: boolean; recurringDayOfMonth?: number | null; recurringEndDate?: string; recurringParentId?: string; recurringLastGenerated?: string })[])
    .filter((p) =>
      p.isRecurring &&
      !p.recurringParentId &&
      (!p.recurringLastGenerated || p.recurringLastGenerated < currentYearMonth) &&
      todayDay >= (p.recurringDayOfMonth ?? 1) &&
      (!p.recurringEndDate || p.recurringEndDate >= today),
    );

  if (recurringTemplates.length > 0) {
    const newEntries = await Promise.all(
      recurringTemplates.map(async (template) => {
        const day = String(template.recurringDayOfMonth ?? 1).padStart(2, "0");
        const dueDate = `${currentYearMonth}-${day}`;
        const baseInvoice = template.invoiceNumber ?? "";
        const newInvoice = baseInvoice ? `${baseInvoice}-${currentYearMonth}` : "";

        const created = await SalesPaymentModel.create({
          projectId: template.projectId,
          salesUserId: template.salesUserId,
          clientName: (template as unknown as { clientName?: string }).clientName ?? "",
          projectName: (template as unknown as { projectName?: string }).projectName ?? "",
          invoiceNumber: newInvoice,
          amount: template.amount ?? 0,
          receivedAmount: 0,
          dueDate,
          receivedDate: "",
          status: "PENDING",
          note: template.note ?? "",
          isRecurring: false,
          recurringParentId: template._id.toString(),
          recurringDayOfMonth: null,
          recurringEndDate: "",
          recurringLastGenerated: "",
        });

        await SalesPaymentModel.findByIdAndUpdate(template._id, {
          recurringLastGenerated: currentYearMonth,
        });

        return created;
      }),
    );

    // Add newly generated entries to rawPayments so they show up immediately
    for (const entry of newEntries) {
      (rawPayments as unknown as typeof rawPayments).push(entry as unknown as typeof rawPayments[number]);
    }
  }

  // Auto-mark overdue in memory (don't save to DB on every read — that's done lazily)
  const creatorIds = Array.from(new Set(rawPayments.map((p) => p.salesUserId).filter(Boolean)));
  const creatorUsers = creatorIds.length
    ? await UserModel.find({ _id: { $in: creatorIds } }, { fullName: 1 }).lean()
    : [];
  const creatorMap = new Map(creatorUsers.map((u) => [u._id.toString(), u.fullName]));

  const payments: ClientPaymentEntry[] = (rawPayments as unknown as (typeof rawPayments[number] & { isRecurring?: boolean; recurringDayOfMonth?: number | null; recurringEndDate?: string; recurringParentId?: string })[]).map((p) => {
    const amount = Number(p.amount ?? 0);
    const receivedAmount = Number(p.receivedAmount ?? 0);
    const balanceDue = Math.max(amount - receivedAmount, 0);
    // Auto-resolve status for display
    let status = p.status as string;
    if (status === "PENDING" && p.dueDate && p.dueDate < today) {
      status = "OVERDUE";
    }

    return {
      id: p._id.toString(),
      projectId: p.projectId ?? "",
      clientName: (p as unknown as { clientName?: string }).clientName ?? "",
      projectName: projectsForSuggestions.find((project) => String(project._id) === p.projectId)?.name ?? p.projectName ?? "",
      invoiceNumber: p.invoiceNumber ?? "",
      totalAmount: amount,
      receivedAmount,
      balanceDue,
      dueDate: p.dueDate ?? "",
      receivedDate: p.receivedDate ?? "",
      status,
      note: p.note ?? "",
      createdByUserId: p.salesUserId,
      createdByName: creatorMap.get(p.salesUserId) ?? "Unknown",
      createdAt: p.createdAt ? formatIndiaDateTime(p.createdAt) : "Not marked",
      transactions: ((p as unknown as { transactions?: { _id?: { toString(): string }; txDate?: string; txAmount?: number; note?: string; createdAt?: Date | null }[] }).transactions ?? []).map((t) => ({
        id: t._id?.toString() ?? "",
        txDate: t.txDate ?? "",
        txAmount: Number(t.txAmount ?? 0),
        note: t.note ?? "",
        createdAt: t.createdAt ? formatIndiaDateTime(t.createdAt) : "",
      })),
      isRecurring: p.isRecurring ?? false,
      recurringDayOfMonth: p.recurringDayOfMonth ?? null,
      recurringEndDate: p.recurringEndDate ?? "",
      recurringParentId: p.recurringParentId ?? "",
    };
  });

  const totalCollected = payments.filter((p) => p.status === "PAID" || p.receivedAmount > 0).reduce((sum, p) => sum + p.receivedAmount, 0);
  const totalPending = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.balanceDue, 0);
  const totalOverdue = payments.filter((p) => p.status === "OVERDUE").reduce((sum, p) => sum + p.balanceDue, 0);
  const totalBalance = payments.filter((p) => p.status !== "PAID").reduce((sum, p) => sum + p.balanceDue, 0);
  const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;
  const paidCount = payments.filter((p) => p.status === "PAID").length;
  const partialCount = payments.filter((p) => p.status === "PARTIAL").length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  return {
    payments,
    canManage,
    totalCollected,
    totalPending,
    totalOverdue,
    totalBalance,
    overdueCount,
    paidCount,
    partialCount,
    pendingCount,
    projectSuggestions,
  };
}
