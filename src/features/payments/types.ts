// ─── Client Payments ────────────────────────────────────────────────────────

export type PaymentTransaction = {
  id: string;
  txDate: string;
  txAmount: number;
  note: string;
  createdAt: string;
};

export type ClientPaymentEntry = {
  id: string;
  clientName: string;
  projectName: string;
  invoiceNumber: string;
  totalAmount: number;
  receivedAmount: number;
  balanceDue: number;
  dueDate: string;
  receivedDate: string;
  status: string; // PENDING | PARTIAL | PAID | OVERDUE
  note: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  transactions: PaymentTransaction[];
  isRecurring: boolean;
  recurringDayOfMonth: number | null;
  recurringEndDate: string;
  recurringParentId: string;
};

export type PaymentsPageData = {
  payments: ClientPaymentEntry[];
  canManage: boolean;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  totalBalance: number;
  overdueCount: number;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  projectSuggestions: { clientName: string; projectName: string }[];
};

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

