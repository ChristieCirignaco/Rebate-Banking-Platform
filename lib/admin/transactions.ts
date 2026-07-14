import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toMajor } from "@/lib/money/money";
import type {
  TransactionDirection,
  TransactionsParams,
  TransactionsResult,
  TransactionStatus,
} from "@/components/admin/transactions/types";

export const TRANSACTIONS_PAGE_SIZE = 15;

// Site-wide wallet ledger, server-paginated with date-range, source, status, direction and
// search filters. This is the single source of truth for "all transactions".
export async function getTransactions(
  params: TransactionsParams = {},
): Promise<TransactionsResult> {
  const rawPageSize = params.pageSize ?? TRANSACTIONS_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), 100)
      : TRANSACTIONS_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);

  const source = params.source && params.source !== "all" ? params.source : undefined;
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const direction =
    params.direction && params.direction !== "all" ? params.direction : undefined;
  // Drop a leading "#" so pasting the displayed id ("#3f9a1b2c") matches the stored uuid.
  const search = params.search?.trim().replace(/^#/, "");

  const createdAt: Prisma.DateTimeFilter = {};
  if (params.from) createdAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  if (params.to) createdAt.lte = new Date(`${params.to}T23:59:59.999Z`);

  const where: Prisma.WalletTransactionWhereInput = {
    ...(source ? { source } : {}),
    ...(status ? { status } : {}),
    ...(direction ? { direction } : {}),
    ...(params.from || params.to ? { createdAt } : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { provider: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { referenceId: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.walletTransaction.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.walletTransaction.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    // id tiebreaker gives tied timestamps a stable total order, so rows can't duplicate or
    // vanish across pages (ledger entries posted in one txn share an identical created_at).
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    rows: rows.map((row) => ({
      id: row.id,
      user: {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        avatarUrl: row.user.image ?? undefined,
      },
      currency: row.currency,
      direction: row.direction as TransactionDirection,
      amount: (row.direction === "credit" ? 1 : -1) * toMajor(row.amountMinor),
      source: row.source,
      status: row.status as TransactionStatus,
      provider: row.provider,
      description: row.description,
      memo: row.memo,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      balanceAfter: toMajor(row.balanceAfterMinor),
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}
