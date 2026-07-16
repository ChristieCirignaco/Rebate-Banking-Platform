"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { postLedgerEntry } from "@/lib/money/ledger";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };

function revalidate() {
  revalidatePath("/admin/transfers");
}

// Approve a pending transfer. The sender's debit was already held on request; approval marks
// it completed and — for INTERNAL transfers only — credits the recipient's wallet (money that
// stays on-platform). Domestic/wire funds left the platform, so approval just completes.
export async function approveTransfer(id: string, remarks?: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) return { ok: false, error: "Transfer not found." };
  if (transfer.status !== "pending") {
    return { ok: false, error: "This transfer has already been reviewed." };
  }
  const note = remarks?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.transfer.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "completed",
          remarks: note,
          reviewedById: session.user.id,
          reviewedByName: session.user.name,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");

      // Internal: land the funds in the recipient's wallet (idempotent on the transfer id).
      if (transfer.type === "internal" && !transfer.creditTransactionId) {
        if (!transfer.recipientUserId) throw new Error("NORECIPIENT");
        const wallet = await tx.wallet.upsert({
          where: {
            userId_currency: {
              userId: transfer.recipientUserId,
              currency: transfer.currency,
            },
          },
          update: {},
          create: {
            userId: transfer.recipientUserId,
            currency: transfer.currency,
            isDefault: false,
          },
        });
        const credit = await postLedgerEntry({
          walletId: wallet.id,
          userId: transfer.recipientUserId,
          currency: transfer.currency,
          direction: "credit",
          amountMinor: transfer.amountMinor,
          source: "transfer",
          idempotencyKey: `transfer:${transfer.id}:credit`,
          referenceType: "transfer",
          referenceId: transfer.id,
          description: `Transfer received (${transfer.txnId})`,
          client: tx,
        });
        if (!credit.ok) throw new Error("LEDGER");
        await tx.transfer.update({
          where: { id },
          data: { creditTransactionId: credit.id },
        });
      }
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "ALREADY") return { ok: false, error: "This transfer has already been reviewed." };
    if (message === "NORECIPIENT") return { ok: false, error: "Internal transfer has no recipient." };
    return { ok: false, error: "Could not approve the transfer. Please try again." };
  }
  revalidate();
  return { ok: true };
}

// Reject a pending transfer and refund the sender's held funds (idempotent reversal credit).
export async function rejectTransfer(id: string, remarks?: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) return { ok: false, error: "Transfer not found." };
  if (transfer.status !== "pending") {
    return { ok: false, error: "This transfer has already been reviewed." };
  }
  const note = remarks?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.transfer.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "rejected",
          remarks: note,
          reviewedById: session.user.id,
          reviewedByName: session.user.name,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");

      if (transfer.debitTransactionId && !transfer.refundTransactionId) {
        const wallet = await tx.wallet.upsert({
          where: {
            userId_currency: { userId: transfer.userId, currency: transfer.currency },
          },
          update: {},
          create: { userId: transfer.userId, currency: transfer.currency, isDefault: false },
        });
        const refund = await postLedgerEntry({
          walletId: wallet.id,
          userId: transfer.userId,
          currency: transfer.currency,
          direction: "credit",
          amountMinor: transfer.amountMinor,
          source: "transfer_reversal",
          idempotencyKey: `transfer_reversal:${transfer.id}`,
          referenceType: "transfer",
          referenceId: transfer.id,
          description: `Transfer refund (${transfer.txnId})`,
          client: tx,
        });
        if (!refund.ok) throw new Error("LEDGER");
        await tx.transfer.update({ where: { id }, data: { refundTransactionId: refund.id } });
      }
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "ALREADY") return { ok: false, error: "This transfer has already been reviewed." };
    return { ok: false, error: "Could not reject the transfer. Please try again." };
  }
  revalidate();
  return { ok: true };
}
