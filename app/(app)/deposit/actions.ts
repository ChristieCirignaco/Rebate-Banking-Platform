"use server";

import { randomUUID } from "node:crypto";

import { requireActiveUser } from "@/lib/auth-guards";
import { controlAllows } from "@/lib/controls";
import { requirementBlock } from "@/lib/user-gates";
import { prisma } from "@/lib/db";
import { isDepositProofUrl } from "@/lib/deposit-proof";
import { formatCurrency } from "@/lib/format";
import { notifyAdmins, notifyUserOf } from "@/lib/notifications";
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


// Create a deposit. Passcode-gated (transaction PIN) and fail-closed on the deposits flag +
// the per-user deposit control. Every method — auto or manual — posts as `pending` and credits
// nothing; approveDeposit does the crediting once an admin confirms the money arrived.
export async function createDeposit(input: DepositInput, pin: string): Promise<DepositResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("deposits"))) {
    return { ok: false, error: "Deposits are currently disabled." };
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, transactionPin: true, emailVerified: true, kycStatus: true },
  });
  if (!sender) return { ok: false, error: "Account not found." };
  if (!controlAllows(sender.controls, "deposit")) {
    return { ok: false, error: "Deposits are disabled on your account. Please contact support." };
  }
  const blocked = await requirementBlock(sender);
  if (blocked) return { ok: false, error: blocked };
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
      // A select only ever stores one of the admin's own choices — the client's <select> is not
      // a constraint, so re-check the value against the field's options here.
      if (value && field.type === "select" && !field.options.includes(value)) {
        return { ok: false, error: `Choose a valid ${field.label}.` };
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

  // EVERY deposit is created pending and credits nothing. The wallet is only credited when an
  // admin approves it, in approveDeposit — which posts the ledger entry and awards the referral
  // inside one transaction.
  //
  // Auto methods used to self-approve right here: they wrote a `completed` deposit and posted
  // the credit immediately, justified by the comment "simulate an instant provider success".
  // Nothing simulated the *payment*. There is no charge call and no webhook anywhere in
  // lib/payment-gateways — it holds branding and credential schemas only — so this credited
  // real, spendable balance for money that was never collected. Any user could mint funds by
  // picking an auto method, limited only by the method's maxAmount.
  //
  // Until a gateway is genuinely integrated (charge + webhook confirming settlement), an "auto"
  // method is a manual one with a logo, so it takes the same path: a human confirms the money
  // arrived before the ledger moves. That is also why the type is carried through rather than
  // forced to "manual" — the admin still needs to see which provider the user chose.
  await prisma.deposit.create({
    data: {
      id: depositId,
      txnId,
      userId,
      depositMethodId: method.id,
      type: method.type,
      currency: wallet.currency,
      amountMinor,
      feeMinor,
      status: "pending",
      provider,
      description: `Deposit via ${method.name}`,
      fieldValues,
    },
  });
  // Best-effort: the deposit is already committed, so a notify failure must never surface as a
  // failed request.
  try {
    await notifyAdmins({
      type: "deposit_requested",
      title: "New deposit request",
      message: `Deposit ${txnId} of ${formatCurrency(amountMajor, wallet.currency)} via ${method.name} is pending approval.`,
    });
  } catch {
    // ignored — the admin queue still shows the deposit.
  }
  // Nothing is credited until an admin approves, so without this the user hears nothing between
  // submitting and the decision landing — and reads the untouched balance as a lost payment.
  // Best-effort (notifyUserOf swallows its own errors), so it can never fail the committed request.
  await notifyUserOf(userId, {
    type: "email",
    title: "Deposit Request Received",
    message: `Your deposit ${txnId} of ${formatCurrency(amountMajor, wallet.currency)} is pending review. We'll let you know once it's approved.`,
    rows: [
      { label: "Amount", value: formatCurrency(amountMajor, wallet.currency) },
      { label: "Method", value: method.name },
      { label: "Reference", value: txnId },
    ],
    cta: { label: "View transactions", url: "/transactions" },
  });
  return {
    ok: true,
    next: "/transactions",
    // "pending", not "completed": the row commits as pending and credits nothing until an admin
    // approves, so the dialog must not tell the user the money has landed.
    status: "pending",
    txnId,
    amountLabel: formatCurrency(amountMajor, wallet.currency),
    details: [
      { label: "Method", value: method.name },
      { label: "Wallet", value: wallet.currency },
    ],
    message: "Deposit request submitted — pending admin approval.",
  };
}
