"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { postLedgerEntry } from "@/lib/money/ledger";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };

function revalidate() {
  revalidatePath("/admin/requests");
}

// Approve a money request: atomically compare-and-set pending → approved AND post the wallet
// credit in one transaction, so a concurrent approve/reject can't leave a credited-but-rejected
// request. The ledger write is idempotent (key money_request:<id>). Mirrors approveDeposit.
export async function approveRequest(id: string, remarks?: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const request = await prisma.moneyRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "pending") {
    return { ok: false, error: "This request has already been reviewed." };
  }
  if (request.amountMinor <= 0n) return { ok: false, error: "Invalid request amount." };
  const note = remarks?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.moneyRequest.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "approved",
          remarks: note,
          reviewedById: session.user.id,
          reviewedByName: session.user.name,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");

      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: request.userId, currency: request.currency } },
        update: {},
        create: { userId: request.userId, currency: request.currency, isDefault: false },
      });
      const credit = await postLedgerEntry({
        walletId: wallet.id,
        userId: request.userId,
        currency: request.currency,
        direction: "credit",
        amountMinor: request.amountMinor,
        source: "money_request",
        idempotencyKey: `money_request:${request.id}`,
        referenceType: "money_request",
        referenceId: request.id,
        description: request.reason ? `Money request: ${request.reason}` : "Money request approved",
        client: tx,
      });
      if (!credit.ok) throw new Error("LEDGER");
      await tx.moneyRequest.update({ where: { id }, data: { walletTransactionId: credit.id } });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "ALREADY") {
      return { ok: false, error: "This request has already been reviewed." };
    }
    return { ok: false, error: "Could not credit the wallet. Please try again." };
  }
  revalidate();
  return { ok: true };
}

// Reject a money request — compare-and-set so it can't clobber a concurrent approval. No
// ledger effect (nothing was ever debited/held for a request).
export async function rejectRequest(id: string, remarks?: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const claim = await prisma.moneyRequest.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "rejected",
      remarks: remarks?.trim() || null,
      reviewedById: session.user.id,
      reviewedByName: session.user.name,
      reviewedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    const exists = await prisma.moneyRequest.count({ where: { id } });
    return {
      ok: false,
      error: exists ? "This request has already been reviewed." : "Request not found.",
    };
  }
  revalidate();
  return { ok: true };
}

// Remove a request record. The append-only wallet_transactions ledger is left untouched, so a
// previously-approved request keeps its credit.
export async function deleteRequest(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const existing = await prisma.moneyRequest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "Request not found." };

  await prisma.moneyRequest.delete({ where: { id } });
  revalidate();
  return { ok: true };
}
