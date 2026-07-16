import type { Prisma } from "@prisma/client";

import { presentTransaction, type TransactionView } from "@/lib/dashboard/transactions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

// Transaction search behind the header search box. Every query is scoped to ONE user: the
// caller passes the SESSION user's id (see app/(app)/search/actions.ts) — a userId is never
// taken from the client, so this can't be pointed at another account's ledger.
//
// Rows are presented HERE (server-side) through the same presentTransaction the dashboard and
// history list use, so what crosses the RSC boundary is a plain, serializable view object —
// `amountMinor` (BigInt) never leaves this module, and currency strings are never hand-rolled.

export const SEARCH_MIN_QUERY = 2; // shorter than this matches half the ledger — not useful
export const SEARCH_MAX_QUERY = 64;
export const SEARCH_DEFAULT_LIMIT = 8;
export const SEARCH_MAX_LIMIT = 25;

// How many source rows one code lookup may contribute (per table). Bounds the `in` list below.
const CODE_CANDIDATES = 20;

export type TransactionSearchResult = TransactionView & {
  dateLabel: string; // absolute date, e.g. "Jul 16, 2026, 6:11 AM UTC"
};

// Human txn codes are alphanumeric + dashes: txnCode() -> "DEP-1A2B3C4D", vouchers -> "VCHR…".
const CODE_LIKE = /^[a-z0-9-]+$/i;

// The ledger's `referenceId` holds the SOURCE ROW's uuid, not its human txn code (see
// lib/transaction-detail.ts, which resolves referenceId via findUnique({ where: { id } })).
// So matching a code like "DEP-B8C7" means resolving codes -> source ids first, then matching
// referenceId against them.
//
// These lookups are deliberately NOT filtered by userId: the ledger query below always AND-s
// the caller's userId, so a foreign id in this candidate list can only fail to match — it can
// never widen the result past the caller's own rows. Keeping them unscoped is what lets a
// REDEEMED voucher (created by another user) stay findable by code from the redeemer's row.
async function referenceIdsForCode(code: string): Promise<string[]> {
  const txnId = { contains: code, mode: "insensitive" } as const;
  const take = CODE_CANDIDATES;
  const [deposits, withdraws, transfers, exchanges, requests, vouchers] = await Promise.all([
    prisma.deposit.findMany({ where: { txnId }, select: { id: true }, take }),
    prisma.withdraw.findMany({ where: { txnId }, select: { id: true }, take }),
    prisma.transfer.findMany({ where: { txnId }, select: { id: true }, take }),
    prisma.exchange.findMany({ where: { txnId }, select: { id: true }, take }),
    prisma.moneyRequest.findMany({ where: { txnId }, select: { id: true }, take }),
    prisma.voucher.findMany({
      where: { code: { contains: code, mode: "insensitive" } },
      select: { id: true },
      take,
    }),
  ]);
  return [...deposits, ...withdraws, ...transfers, ...exchanges, ...requests, ...vouchers].map(
    (row) => row.id,
  );
}

// Search one user's ledger. Returns [] for a query under SEARCH_MIN_QUERY chars rather than
// dumping the whole ledger. `q` is trimmed + bounded and `limit` is clamped, so neither can be
// used to force an expensive scan.
export async function searchUserTransactions(
  userId: string,
  q: string,
  limit = SEARCH_DEFAULT_LIMIT,
): Promise<TransactionSearchResult[]> {
  const search = q.trim().slice(0, SEARCH_MAX_QUERY);
  if (search.length < SEARCH_MIN_QUERY) return [];

  const take =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), SEARCH_MAX_LIMIT)
      : SEARCH_DEFAULT_LIMIT;

  // Same shape as the admin ledger search (lib/admin/transactions.ts): `contains` +
  // insensitive mode, OR-ed across the row's searchable text.
  const or: Prisma.WalletTransactionWhereInput[] = [
    { description: { contains: search, mode: "insensitive" } },
    { memo: { contains: search, mode: "insensitive" } },
    { source: { contains: search, mode: "insensitive" } },
    { provider: { contains: search, mode: "insensitive" } },
    { currency: { contains: search, mode: "insensitive" } },
    { referenceId: { contains: search, mode: "insensitive" } },
  ];

  if (CODE_LIKE.test(search)) {
    const ids = await referenceIdsForCode(search);
    if (ids.length > 0) or.push({ referenceId: { in: ids } });
  }

  // userId AND (…OR…) — Prisma AND-s top-level keys, so the ownership filter can never be
  // OR-ed away by a match on the search terms.
  const rows = await prisma.walletTransaction.findMany({
    where: { userId, OR: or },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      direction: true,
      amountMinor: true,
      currency: true,
      source: true,
      status: true,
      description: true,
      memo: true,
      provider: true,
      createdAt: true,
    },
  });

  const now = new Date();
  return rows.map((row) => {
    const view = presentTransaction(row, now);
    return { ...view, dateLabel: formatDateTime(view.createdAtISO) };
  });
}
