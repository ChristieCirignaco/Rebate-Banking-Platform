"use server";

import { randomUUID } from "node:crypto";

import { requireActiveUser } from "@/lib/auth-guards";
import { controlAllows } from "@/lib/controls";
import { requirementBlock } from "@/lib/user-gates";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMajor, toMinor } from "@/lib/money/money";
import { AmountSchema, txnCode } from "@/lib/money/txn";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { verifyTransactionPin } from "@/lib/transaction-pin";

export type ExchangeInput = { fromWalletId: string; toWalletId: string; amount: string };
export type ExchangeResult =
  | { ok: true; next: string; message: string }
  | { ok: false; error: string; needPin?: boolean };

// Exchange between two of the user's own wallets. Instant + passcode-gated: verify the PIN, then
// in one transaction create the Exchange record, debit the `from` wallet and credit the `to`
// wallet at the admin-configured Currency.rate cross-rate. Fail-closed on the exchange flag + the
// per-user control. Amounts are recomputed server-side from the stored rates (the client preview
// is advisory only).
export async function createExchange(input: ExchangeInput, pin: string): Promise<ExchangeResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("exchange"))) {
    return { ok: false, error: "Currency exchange is currently disabled." };
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, transactionPin: true, emailVerified: true, kycStatus: true },
  });
  if (!sender) return { ok: false, error: "Account not found." };
  if (!controlAllows(sender.controls, "exchange_money")) {
    return { ok: false, error: "Exchange is disabled on your account. Please contact support." };
  }
  const blocked = requirementBlock(sender);
  if (blocked) return { ok: false, error: blocked };
  if (!sender.transactionPin) {
    return { ok: false, error: "Set up your transaction PIN in Security first.", needPin: true };
  }
  if (!(await verifyTransactionPin(userId, pin))) {
    return { ok: false, error: "Incorrect transaction PIN." };
  }

  if (input.fromWalletId === input.toWalletId) {
    return { ok: false, error: "Choose two different wallets." };
  }
  const amount = AmountSchema.safeParse(input.amount);
  if (!amount.success) {
    return { ok: false, error: amount.error.issues[0]?.message ?? "Invalid amount." };
  }

  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findFirst({
      where: { id: input.fromWalletId, userId },
      select: { id: true, currency: true, balanceMinor: true },
    }),
    prisma.wallet.findFirst({
      where: { id: input.toWalletId, userId },
      select: { id: true, currency: true },
    }),
  ]);
  if (!fromWallet || !toWallet) return { ok: false, error: "Select valid wallets." };
  if (fromWallet.currency === toWallet.currency) {
    return { ok: false, error: "Choose two different currencies." };
  }

  const currencies = await prisma.currency.findMany({
    where: { code: { in: [fromWallet.currency, toWallet.currency] }, isActive: true },
    select: { code: true, rate: true },
  });
  const rateFrom = Number(currencies.find((c) => c.code === fromWallet.currency)?.rate ?? 0);
  const rateTo = Number(currencies.find((c) => c.code === toWallet.currency)?.rate ?? 0);
  if (rateFrom <= 0 || rateTo <= 0) {
    return { ok: false, error: "Exchange isn't available for these currencies right now." };
  }

  const fromAmountMinor = toMinor(amount.data);
  if (fromWallet.balanceMinor < fromAmountMinor) {
    return { ok: false, error: "Insufficient balance in the source wallet." };
  }
  const crossRate = rateTo / rateFrom;
  const toAmountMinor = toMinor(toMajor(fromAmountMinor) * crossRate);
  if (toAmountMinor <= 0n) return { ok: false, error: "Amount is too small to convert." };

  const exchangeId = randomUUID();
  const txnId = txnCode("EXC");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.exchange.create({
        data: {
          id: exchangeId,
          txnId,
          userId,
          fromCurrency: fromWallet.currency,
          toCurrency: toWallet.currency,
          fromAmountMinor,
          toAmountMinor,
          rate: crossRate,
          status: "completed",
        },
      });
      const debit = await postLedgerEntry({
        walletId: fromWallet.id,
        userId,
        currency: fromWallet.currency,
        direction: "debit",
        amountMinor: fromAmountMinor,
        source: "exchange",
        idempotencyKey: `exchange:${exchangeId}:debit`,
        referenceType: "exchange",
        referenceId: exchangeId,
        description: `Exchange to ${toWallet.currency} (${txnId})`,
        client: tx,
      });
      if (!debit.ok) throw new Error(debit.reason === "insufficient_funds" ? "INSUFFICIENT" : "LEDGER");

      const credit = await postLedgerEntry({
        walletId: toWallet.id,
        userId,
        currency: toWallet.currency,
        direction: "credit",
        amountMinor: toAmountMinor,
        source: "exchange",
        idempotencyKey: `exchange:${exchangeId}:credit`,
        referenceType: "exchange",
        referenceId: exchangeId,
        description: `Exchange from ${fromWallet.currency} (${txnId})`,
        client: tx,
      });
      if (!credit.ok) throw new Error("LEDGER");

      await tx.exchange.update({
        where: { id: exchangeId },
        data: { debitTransactionId: debit.id, creditTransactionId: credit.id },
      });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "INSUFFICIENT") {
      return { ok: false, error: "Insufficient balance in the source wallet." };
    }
    return { ok: false, error: "Could not complete the exchange. Please try again." };
  }

  return {
    ok: true,
    next: "/exchange",
    message: `Exchanged ${formatCurrency(toMajor(fromAmountMinor), fromWallet.currency)} to ${formatCurrency(toMajor(toAmountMinor), toWallet.currency)}.`,
  };
}
