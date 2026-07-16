"use server";

import { randomUUID } from "node:crypto";

import { requireActiveUser } from "@/lib/auth-guards";
import { controlAllows } from "@/lib/controls";
import { prisma } from "@/lib/db";
import { isDepositProofUrl } from "@/lib/deposit-proof";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMinor } from "@/lib/money/money";
import { AmountSchema, txnCode } from "@/lib/money/txn";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { verifyTransactionPin } from "@/lib/transaction-pin";

export type DepositInput = {
  walletId: string;
  methodId: string;
  amount: string;
  fields?: Record<string, string>; // manual custom-field values, keyed by field id
};
export type DepositResult =
  | { ok: true; next: string; message: string }
  | { ok: false; error: string; needPin?: boolean };


// Create a deposit. Passcode-gated (transaction PIN) and fail-closed on the deposits flag +
// the per-user deposit control. Manual methods post as `pending` for admin approval (which
// credits the wallet later); auto methods simulate an instant provider success — completing
// and crediting the wallet immediately (no external gateway is wired).
export async function createDeposit(input: DepositInput, pin: string): Promise<DepositResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("deposits"))) {
    return { ok: false, error: "Deposits are currently disabled." };
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, transactionPin: true },
  });
  if (!sender) return { ok: false, error: "Account not found." };
  if (!controlAllows(sender.controls, "deposit")) {
    return { ok: false, error: "Deposits are disabled on your account. Please contact support." };
  }
  if (!sender.transactionPin) {
    return { ok: false, error: "Set up your transaction PIN in Security first.", needPin: true };
  }
  if (!(await verifyTransactionPin(userId, pin))) {
    return { ok: false, error: "Incorrect transaction PIN." };
  }

  const amount = AmountSchema.safeParse(input.amount);
  if (!amount.success) return { ok: false, error: amount.error.issues[0]?.message ?? "Invalid amount." };
  const amountMajor = amount.data;

  const wallet = await prisma.wallet.findFirst({
    where: { id: input.walletId, userId },
    select: { id: true, currency: true },
  });
  if (!wallet) return { ok: false, error: "Select a valid wallet." };

  const method = await prisma.depositMethod.findUnique({
    where: { id: input.methodId },
    include: { currency: { select: { code: true } }, paymentGateway: { select: { name: true } }, fields: true },
  });
  if (!method || !method.isActive || method.currency.code !== wallet.currency) {
    return { ok: false, error: "Select a valid payment method for this wallet." };
  }

  const minAmount = Number(method.minAmount);
  const maxAmount = Number(method.maxAmount);
  if (minAmount > 0 && amountMajor < minAmount) {
    return { ok: false, error: `Minimum deposit is ${minAmount} ${wallet.currency}.` };
  }
  if (maxAmount > 0 && amountMajor > maxAmount) {
    return { ok: false, error: `Maximum deposit is ${maxAmount} ${wallet.currency}.` };
  }

  // Manual custom fields → a submission-time snapshot [{label, value}]; enforce required ones.
  // A "file" field carries an uploaded proof URL (from /api/user/deposit-proof), never free
  // text — reject anything else so the snapshot can only hold a real, admin-servable proof.
  const fieldValues: { label: string; value: string }[] = [];
  if (method.type === "manual") {
    for (const field of method.fields) {
      const value = (input.fields?.[field.id] ?? "").trim();
      if (field.required && !value) {
        return { ok: false, error: `${field.label} is required.` };
      }
      if (value && field.type === "file" && !isDepositProofUrl(value)) {
        return { ok: false, error: `Upload a valid file for ${field.label}.` };
      }
      if (value) fieldValues.push({ label: field.label, value });
    }
  }

  const amountMinor = toMinor(amountMajor);
  const feeMajor = method.chargeType === "percent" ? (amountMajor * Number(method.chargeValue)) / 100 : Number(method.chargeValue);
  const feeMinor = toMinor(Math.max(0, feeMajor));
  const provider = method.paymentGateway?.name ?? method.name;
  const depositId = randomUUID();
  const txnId = txnCode("DEP");

  if (method.type === "manual") {
    await prisma.deposit.create({
      data: {
        id: depositId,
        txnId,
        userId,
        depositMethodId: method.id,
        type: "manual",
        currency: wallet.currency,
        amountMinor,
        feeMinor,
        status: "pending",
        provider,
        description: `Deposit via ${method.name}`,
        fieldValues,
      },
    });
    return {
      ok: true,
      next: "/transactions",
      message: "Deposit request submitted — pending admin approval.",
    };
  }

  // Auto: simulate an instant provider success — complete + credit atomically.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.deposit.create({
        data: {
          id: depositId,
          txnId,
          userId,
          depositMethodId: method.id,
          type: "auto",
          currency: wallet.currency,
          amountMinor,
          feeMinor,
          status: "completed",
          provider,
          description: `Deposit via ${method.name}`,
        },
      });
      const credit = await postLedgerEntry({
        walletId: wallet.id,
        userId,
        currency: wallet.currency,
        direction: "credit",
        amountMinor,
        source: "deposit",
        idempotencyKey: `deposit:${depositId}`,
        referenceType: "deposit",
        referenceId: depositId,
        provider,
        description: `Deposit via ${method.name} (${txnId})`,
        client: tx,
      });
      if (!credit.ok) throw new Error("LEDGER");
      await tx.deposit.update({ where: { id: depositId }, data: { walletTransactionId: credit.id } });
    });
  } catch {
    return { ok: false, error: "Could not process the deposit. Please try again." };
  }
  return { ok: true, next: "/transactions", message: "Deposit successful." };
}
