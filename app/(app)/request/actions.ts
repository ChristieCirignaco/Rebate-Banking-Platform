"use server";

import { randomUUID } from "node:crypto";

import { requireActiveUser } from "@/lib/auth-guards";
import { controlAllows } from "@/lib/controls";
import { prisma } from "@/lib/db";
import { toMinor } from "@/lib/money/money";
import { AmountSchema, txnCode } from "@/lib/money/txn";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";

export type RequestInput = { walletId: string; amount: string; reason?: string };
export type RequestResult = { ok: true; message: string } | { ok: false; error: string };

// Create a money request — a user asking the platform to credit their wallet. Fail-closed on the
// request_money flag + the per-user control. No transaction PIN: nothing moves until an admin
// approves (which posts the wallet credit). Mirrors createDeposit's guards, minus the money move.
export async function createMoneyRequest(input: RequestInput): Promise<RequestResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("request_money"))) {
    return { ok: false, error: "Request Money is currently disabled." };
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true },
  });
  if (!sender) return { ok: false, error: "Account not found." };
  if (!controlAllows(sender.controls, "request_money")) {
    return { ok: false, error: "Money requests are disabled on your account. Please contact support." };
  }

  const amount = AmountSchema.safeParse(input.amount);
  if (!amount.success) {
    return { ok: false, error: amount.error.issues[0]?.message ?? "Invalid amount." };
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: input.walletId, userId },
    select: { id: true, currency: true },
  });
  if (!wallet) return { ok: false, error: "Select a valid wallet." };

  const reason = (input.reason ?? "").trim().slice(0, 500) || null;

  await prisma.moneyRequest.create({
    data: {
      id: randomUUID(),
      txnId: txnCode("REQ"),
      userId,
      currency: wallet.currency,
      amountMinor: toMinor(amount.data),
      reason,
      status: "pending",
    },
  });

  return { ok: true, message: "Request submitted — pending admin approval." };
}
