import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type LedgerDirection = "credit" | "debit";

type PostEntryArgs = {
  walletId: string;
  userId: string;
  currency: string;
  direction: LedgerDirection;
  amountMinor: bigint;
  source: string;
  idempotencyKey: string;
  referenceType?: string | null;
  referenceId?: string | null;
  status?: string;
  provider?: string | null;
  description?: string | null;
  memo?: string | null;
  // Debits only: reversals/adjustments may drive the balance negative; user debits may not.
  allowNegative?: boolean;
};

export type PostResult =
  | { ok: true; id: string; balanceAfterMinor: bigint }
  | { ok: false; reason: "insufficient_funds" | "duplicate" };

// Atomic money write: ONE CTE statement updates the wallet balance and inserts the
// ledger row, so the insert is gated by the balance update — no two-statement window
// (design spec §7). The unique idempotency key makes retries safe; debits are guarded
// against overdraw unless allowNegative is set.
export async function postLedgerEntry(
  args: PostEntryArgs,
): Promise<PostResult> {
  const {
    walletId,
    userId,
    currency,
    direction,
    amountMinor,
    source,
    idempotencyKey,
    referenceType = null,
    referenceId = null,
    status = "completed",
    provider = null,
    description = null,
    memo = null,
    allowNegative = false,
  } = args;

  if (amountMinor <= 0n) throw new Error("amountMinor must be positive");

  const id = randomUUID();
  const signed = direction === "credit" ? amountMinor : -amountMinor;
  const guard =
    direction === "debit" && !allowNegative
      ? Prisma.sql`AND balance_minor >= ${amountMinor}::bigint`
      : Prisma.empty;

  try {
    const rows = await prisma.$queryRaw<{ balance_after_minor: bigint }[]>`
      WITH upd AS (
        UPDATE wallets
           SET balance_minor = balance_minor + ${signed}::bigint,
               updated_at = now()
         WHERE id = ${walletId}
         ${guard}
        RETURNING balance_minor
      )
      INSERT INTO wallet_transactions
        (id, user_id, wallet_id, currency, direction, amount_minor, source,
         reference_type, reference_id, idempotency_key, balance_after_minor, status,
         provider, description, memo, created_at)
      SELECT ${id}, ${userId}, ${walletId}, ${currency}, ${direction},
             ${amountMinor}::bigint, ${source}, ${referenceType}, ${referenceId},
             ${idempotencyKey}, upd.balance_minor, ${status}, ${provider},
             ${description}, ${memo}, now()
      FROM upd
      RETURNING balance_after_minor
    `;

    if (rows.length === 0) return { ok: false, reason: "insufficient_funds" };
    return { ok: true, id, balanceAfterMinor: rows[0].balance_after_minor };
  } catch (error) {
    // Duplicate idempotency key → the entry already posted; safe no-op.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "duplicate" };
    }
    throw error;
  }
}

export function getUserWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
  });
}

export function getUserTransactions(userId: string, limit = 50) {
  return prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
