"use server";

import { randomUUID } from "node:crypto";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { notifyAdmins, notifyUserOf } from "@/lib/notifications";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMajor, toMinor } from "@/lib/money/money";
import { AmountSchema, txnCode } from "@/lib/money/txn";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getSettings } from "@/lib/settings/store";
import { verifyTransactionPin } from "@/lib/transaction-pin";
import { getWithdrawGate, kindForCurrencyType, toFieldValues } from "@/lib/withdrawals";

export type WithdrawAccountInput = {
  methodId: string;
  label?: string;
  fields: Record<string, string>; // keyed by WithdrawMethodField id
};
export type AccountResult = { ok: true; accountId: string } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

export type WithdrawInput = { walletId: string; accountId: string; amount: string };
export type WithdrawResult =
  | {
      ok: true;
      next: string;
      message: string;
      status?: "completed" | "pending";
      txnId?: string;
      amountLabel?: string;
      details?: { label: string; value: string }[];
    }
  | { ok: false; error: string; needPin?: boolean };

// Every endpoint here is behind the withdrawals feature flag (fail-closed). Moving money needs
// more: the per-user gate (the "withdraw" control, the admin's withdrawalStatus/message, and the
// KYC requirement from Settings → Limits). Saving or removing a payout destination moves no money
// and stays available to a user the admin has paused — they can get their details ready.
async function flagOff(): Promise<string | null> {
  return (await isFeatureEnabled("withdrawals")) ? null : "Withdrawals are currently disabled.";
}

async function blockedReason(userId: string): Promise<string | null> {
  const off = await flagOff();
  if (off) return off;
  const gate = await getWithdrawGate(userId);
  return gate.allowed ? null : (gate.reason ?? "Withdrawals are unavailable on your account.");
}

export type WithdrawGateCheck = { allowed: true } | { allowed: false; reason: string };

// Re-check the withdrawal gate at the moment the user submits the form, rather than only at page
// load. Two reasons this is its own action:
//
//  1. The page's `data.gate` is a snapshot from render time. An admin can pause an account while
//     the user is still filling the form, and the stale snapshot would wave them through to the
//     PIN step for a withdrawal the server is about to refuse anyway.
//  2. It lets the UI show the admin's message only once the user actually tries to withdraw,
//     instead of replacing the form with a blocking banner before they've done anything.
//
// This is a READ ONLY pre-flight. It writes nothing, records no attempt, and holds no session
// state — a blocked user leaves no trace of the attempt. It is also NOT the security boundary:
// createWithdraw() re-runs the very same blockedReason() check before touching the PIN or the
// ledger, so skipping or forging this call gains nothing.
export async function checkWithdrawGate(): Promise<WithdrawGateCheck> {
  const { session } = await requireActiveUser();
  const blocked = await blockedReason(session.user.id);
  return blocked ? { allowed: false, reason: blocked } : { allowed: true };
}

// Save a withdrawal destination from an admin-configured method's own fields (a bank account for
// a fiat method, a crypto address for a crypto one). The stored fieldValues are a snapshot, so a
// later edit to the method's field set never rewrites a saved account.
export async function createWithdrawalAccount(input: WithdrawAccountInput): Promise<AccountResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;
  const off = await flagOff();
  if (off) return { ok: false, error: off };

  const method = await prisma.withdrawMethod.findFirst({
    where: { id: input.methodId, isActive: true, currency: { isActive: true } },
    include: {
      currency: { select: { code: true, type: true } },
      fields: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!method) return { ok: false, error: "Select a valid withdrawal method." };
  if (method.fields.length === 0) {
    // No admin-defined fields means no payout destination to store (getWithdrawData hides these).
    return { ok: false, error: "This method isn't accepting accounts yet. Please contact support." };
  }

  const fieldValues: { label: string; value: string }[] = [];
  let identifier = "";
  for (const f of method.fields) {
    const value = (input.fields?.[f.id] ?? "").trim();
    if (f.required && !value) return { ok: false, error: `${f.label} is required.` };
    if (!value) continue;
    // A select only ever stores one of the admin's own choices — the client's <select> is not a
    // constraint, so re-check the value against the field's options here.
    if (f.type === "select" && !f.options.includes(value)) {
      return { ok: false, error: `Choose a valid ${f.label}.` };
    }
    fieldValues.push({ label: f.label, value: value.slice(0, 300) });
    // Name the account after its first required field — the bank name, the wallet address —
    // since that's the most identifying thing the admin asked for. A nickname overrides it.
    if (f.required && !identifier) identifier = value;
  }
  if (fieldValues.length === 0) return { ok: false, error: "Fill in your account details." };

  const auto = `${method.name} · ${identifier || fieldValues[0].value}`;
  const label = ((input.label ?? "").trim() || auto).slice(0, 80);
  const accountId = randomUUID();

  await prisma.withdrawalAccount.create({
    data: {
      id: accountId,
      userId,
      withdrawMethodId: method.id,
      label,
      currency: method.currency.code,
      kind: kindForCurrencyType(method.currency.type),
      fieldValues,
    },
  });

  // A new payout destination is the step an account takeover needs, so this notice is the
  // security signal — it reaches the address on file even if the attacker is the one adding it.
  // Only the label goes out: the account number / wallet address stays out of the mail.
  await notifyUserOf(userId, {
    type: "email",
    title: "Payout Account Added",
    message: `A new payout account was added to your profile. If this wasn't you, contact support immediately.`,
    rows: [
      { label: "Account", value: label },
      { label: "Method", value: method.name },
    ],
    cta: { label: "Review payout accounts", url: "/withdraw" },
  });

  return { ok: true, accountId };
}

// Removing a destination never touches a Withdraw row: each one snapshots the field values it was
// requested with, so a pending withdrawal survives its account being deleted.
export async function deleteWithdrawalAccount(id: string): Promise<SimpleResult> {
  const { session } = await requireActiveUser();
  const off = await flagOff();
  if (off) return { ok: false, error: off };
  // Read the label before deleting — after the row is gone there is nothing left to name it by,
  // and a notice that can't say WHICH account was removed is close to useless.
  const account = await prisma.withdrawalAccount.findFirst({
    where: { id, userId: session.user.id },
    select: { label: true },
  });
  const removed = await prisma.withdrawalAccount.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (removed.count === 0) return { ok: false, error: "Account not found." };

  // Paired with the add notice: both directions of a payout-destination change are worth telling
  // the account holder about, since removing one is how an attacker hides their tracks.
  await notifyUserOf(session.user.id, {
    type: "email",
    title: "Payout Account Removed",
    message: "A payout account was removed from your profile. If this wasn't you, contact support immediately.",
    ...(account ? { rows: [{ label: "Account", value: account.label }] } : {}),
    cta: { label: "Review payout accounts", url: "/withdraw" },
  });

  return { ok: true };
}

// Request a withdrawal to a saved account. Passcode-gated. Holds the funds immediately: one
// atomic transaction creates the pending Withdraw AND posts the "withdrawal" debit
// (idempotencyKey withdrawal:<id>, linked as heldTransactionId) so it shows in the ledger right
// away. The admin's approve then just completes it; reject refunds via withdrawal_reversal.
export async function createWithdraw(input: WithdrawInput, pin: string): Promise<WithdrawResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;
  const blocked = await blockedReason(userId);
  if (blocked) return { ok: false, error: blocked };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { transactionPin: true },
  });
  if (!user?.transactionPin) {
    return { ok: false, error: "Set up your transaction PIN in Security first.", needPin: true };
  }
  if (!(await verifyTransactionPin(userId, pin))) {
    return { ok: false, error: "Incorrect transaction PIN." };
  }

  const amount = AmountSchema.safeParse(input.amount);
  if (!amount.success) {
    return { ok: false, error: amount.error.issues[0]?.message ?? "Invalid amount." };
  }
  const amountMajor = amount.data;

  const wallet = await prisma.wallet.findFirst({
    where: { id: input.walletId, userId },
    select: { id: true, currency: true, balanceMinor: true },
  });
  if (!wallet) return { ok: false, error: "Select a valid wallet." };

  const account = await prisma.withdrawalAccount.findFirst({
    where: { id: input.accountId, userId },
    include: { method: true },
  });
  if (!account || !account.method.isActive) {
    return { ok: false, error: "Select a valid withdrawal account." };
  }
  if (account.currency !== wallet.currency) {
    return { ok: false, error: "That account doesn't match the selected wallet's currency." };
  }

  const limits = await getSettings("limits");
  if (limits.withdrawalMin > 0 && amountMajor < limits.withdrawalMin) {
    return { ok: false, error: `Minimum withdrawal is ${formatCurrency(limits.withdrawalMin, wallet.currency)}.` };
  }
  if (limits.withdrawalMax > 0 && amountMajor > limits.withdrawalMax) {
    return { ok: false, error: `Maximum withdrawal is ${formatCurrency(limits.withdrawalMax, wallet.currency)}.` };
  }
  const methodMin = Number(account.method.minAmount);
  const methodMax = Number(account.method.maxAmount);
  if (methodMin > 0 && amountMajor < methodMin) {
    return { ok: false, error: `Minimum for this method is ${formatCurrency(methodMin, wallet.currency)}.` };
  }
  if (methodMax > 0 && amountMajor > methodMax) {
    return { ok: false, error: `Maximum for this method is ${formatCurrency(methodMax, wallet.currency)}.` };
  }

  // Daily cap, counted against today's live withdrawals in the SAME currency.
  if (limits.withdrawalDailyLimit > 0) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const agg = await prisma.withdraw.aggregate({
      where: {
        userId,
        currency: wallet.currency,
        createdAt: { gte: start },
        status: { in: ["pending", "completed"] },
      },
      _sum: { amountMinor: true },
    });
    const usedMajor = toMajor(agg._sum.amountMinor ?? 0n);
    if (usedMajor + amountMajor > limits.withdrawalDailyLimit) {
      return {
        ok: false,
        error: `Daily withdrawal limit of ${formatCurrency(limits.withdrawalDailyLimit, wallet.currency)} reached.`,
      };
    }
  }

  const amountMinor = toMinor(amountMajor);
  const feeMajor =
    account.method.chargeType === "percent"
      ? (amountMajor * Number(account.method.chargeValue)) / 100
      : Number(account.method.chargeValue);
  const feeMinor = toMinor(Math.max(0, feeMajor));
  if (feeMinor >= amountMinor) {
    return { ok: false, error: "This amount doesn't cover the withdrawal fee." };
  }
  if (wallet.balanceMinor < amountMinor) {
    return { ok: false, error: "Insufficient wallet balance." };
  }

  const withdrawId = randomUUID();
  const txnId = txnCode("WD");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.withdraw.create({
        data: {
          id: withdrawId,
          txnId,
          userId,
          withdrawMethodId: account.method.id,
          type: account.method.type,
          currency: wallet.currency,
          amountMinor,
          feeMinor,
          status: "pending",
          provider: account.method.name,
          description: `Withdrawal to ${account.label}`,
          fieldValues: toFieldValues(account.fieldValues),
        },
      });
      const debit = await postLedgerEntry({
        walletId: wallet.id,
        userId,
        currency: wallet.currency,
        direction: "debit",
        amountMinor,
        source: "withdrawal",
        idempotencyKey: `withdrawal:${withdrawId}`,
        referenceType: "withdrawal",
        referenceId: withdrawId,
        provider: account.method.name,
        description: `Withdrawal to ${account.label} (${txnId})`,
        client: tx,
      });
      if (!debit.ok) throw new Error(debit.reason === "insufficient_funds" ? "INSUFFICIENT" : "LEDGER");
      await tx.withdraw.update({ where: { id: withdrawId }, data: { heldTransactionId: debit.id } });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "INSUFFICIENT") {
      return { ok: false, error: "Insufficient wallet balance." };
    }
    return { ok: false, error: "Could not submit the withdrawal. Please try again." };
  }

  // Best-effort: the withdrawal (and its hold) is already committed, so a notify failure must
  // never surface as a failed request.
  try {
    await notifyAdmins({
      type: "withdraw_requested",
      title: "New withdrawal request",
      message: `Withdrawal ${txnId} of ${formatCurrency(amountMajor, wallet.currency)} to ${account.label} is pending review.`,
    });
  } catch {
    // ignored — the admin queue still shows the withdrawal.
  }

  // The hold already debited the wallet, so the balance drops the moment this is requested. Tell
  // the user why, and that the payout still needs review. Best-effort (notifyUserOf swallows its
  // own errors), so it can never undo a committed withdrawal.
  await notifyUserOf(userId, {
    type: "email",
    title: "Withdrawal Request Received",
    message: `Your withdrawal ${txnId} of ${formatCurrency(amountMajor, wallet.currency)} to ${account.label} is pending review. The amount is on hold until it's processed.`,
    rows: [
      { label: "Amount", value: formatCurrency(amountMajor, wallet.currency) },
      { label: "Destination", value: account.label },
      { label: "Reference", value: txnId },
    ],
    cta: { label: "View transactions", url: "/transactions" },
  });

  return {
    ok: true,
    next: "/transactions",
    status: "pending",
    txnId,
    amountLabel: formatCurrency(amountMajor, wallet.currency),
    details: [
      { label: "Destination", value: account.label },
      { label: "Wallet", value: wallet.currency },
    ],
    message: `Withdrawal of ${formatCurrency(amountMajor, wallet.currency)} submitted — pending review.`,
  };
}
