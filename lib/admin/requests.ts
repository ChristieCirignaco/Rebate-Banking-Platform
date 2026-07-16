import { prisma } from "@/lib/db";
import { toMajor } from "@/lib/money/money";
import type {
  MoneyRequestHistory,
  MoneyRequestReview,
  MoneyRequestStatus,
} from "@/components/admin/requests/types";

// Admin read layer for Money Requests — mirrors lib/admin/deposits.ts. Amounts are presented
// in major units for the admin UI; the ledger keeps the authoritative minor-unit value.

const requestInclude = { user: { select: { name: true, email: true } } } as const;
type RequestRow = {
  id: string;
  txnId: string;
  amountMinor: bigint;
  currency: string;
  reason: string | null;
  status: string;
  remarks: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  user: { name: string; email: string };
};

function toReview(row: RequestRow): MoneyRequestReview {
  return {
    id: row.id,
    txnId: row.txnId,
    userName: row.user.name,
    userEmail: row.user.email,
    amount: toMajor(row.amountMinor),
    currency: row.currency,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getPendingRequests(): Promise<MoneyRequestReview[]> {
  const rows = await prisma.moneyRequest.findMany({
    where: { status: "pending" },
    include: requestInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toReview);
}

export async function getRequestHistory(): Promise<MoneyRequestHistory[]> {
  const rows = await prisma.moneyRequest.findMany({
    include: requestInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((row) => ({
    ...toReview(row),
    status: row.status as MoneyRequestStatus,
    remarks: row.remarks,
    reviewedByName: row.reviewedByName,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  }));
}
