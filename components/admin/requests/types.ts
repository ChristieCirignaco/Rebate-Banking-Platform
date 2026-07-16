// Shared, prisma-free types for the admin Money Requests UI (safe to import into client
// components). The read layer in lib/admin/requests.ts produces these shapes.

export type MoneyRequestStatus = "pending" | "approved" | "rejected";

// A pending request awaiting admin review.
export interface MoneyRequestReview {
  id: string;
  txnId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  reason: string | null;
  createdAt: string;
}

// A request history row (any status).
export interface MoneyRequestHistory extends MoneyRequestReview {
  status: MoneyRequestStatus;
  remarks: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
}
