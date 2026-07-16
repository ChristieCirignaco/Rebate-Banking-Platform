"use server";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import { requireActiveUser } from "@/lib/auth-guards";
import { controlAllows } from "@/lib/controls";
import { TRANSFER_TYPE_FLAGS, type TransferKind } from "@/components/app/app-nav";
import { requirementBlock } from "@/lib/user-gates";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/format";
import { notifyAdmins, notifyUserOf } from "@/lib/notifications";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMajor, toMinor } from "@/lib/money/money";
import { txnCode } from "@/lib/money/txn";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { verifyTransactionPin } from "@/lib/transaction-pin";
import {
  TRANSFER_AUTH_COOKIE,
  decodeTransferAuth,
  encodeTransferAuth,
  hashOtp,
  nextStep,
  newExpiry,
  type TransferAuthPayload,
  type TransferAuthState,
  type TransferStep,
} from "@/lib/transfer-auth";

// ---------------------------------------------------------------------------
// Real-time recipient lookup (internal transfers)
// ---------------------------------------------------------------------------

export type RecipientLookup = { found: boolean; name?: string };

export async function lookupRecipient(identifier: string): Promise<RecipientLookup> {
  const { session } = await requireActiveUser();
  const id = identifier.trim().replace(/^@/, "");
  if (id.length < 3) return { found: false };

  const recipient = await prisma.user.findFirst({
    where: { OR: [{ email: id.toLowerCase() }, { username: id }] },
    select: { id: true, name: true, role: true },
  });
  if (
    !recipient ||
    recipient.id === session.user.id ||
    recipient.role === "admin" ||
    recipient.role === "super_admin"
  ) {
    return { found: false };
  }
  return { found: true, name: recipient.name };
}

// ---------------------------------------------------------------------------
// Transfer form → authorization session
// ---------------------------------------------------------------------------

export type SendInput = {
  type: "internal" | "domestic" | "wire";
  amount: string;
  description?: string;
  recipient?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swift?: string;
  iban?: string;
  country?: string;
};
export type BeginResult =
  | { ok: true; next: string }
  | { ok: false; error: string; needPin?: boolean };
export type StepResult = { ok: true; next: string; done?: boolean } | { ok: false; error: string };

const AmountSchema = z.coerce
  .number({ message: "Enter a valid amount." })
  .positive("Amount must be greater than 0.")
  .max(1_000_000_000, "Amount is too large.");

const req = (min = 1, max = 120, label = "This field") =>
  z.string().trim().min(min, `${label} is required.`).max(max);

const InternalSchema = z.object({
  amount: AmountSchema,
  description: z.string().trim().max(200).optional(),
  recipient: req(3, 120, "Recipient").transform((v) => v.replace(/^@/, "")),
});
const DomesticSchema = z.object({
  amount: AmountSchema,
  description: z.string().trim().max(200).optional(),
  bankName: req(2, 120, "Bank name"),
  accountName: req(2, 120, "Account name"),
  accountNumber: req(4, 40, "Account number"),
  routingNumber: z.string().trim().max(40).optional(),
});
const WireSchema = z.object({
  amount: AmountSchema,
  description: z.string().trim().max(200).optional(),
  bankName: req(2, 120, "Bank name"),
  accountName: req(2, 120, "Account name"),
  swift: req(6, 20, "SWIFT / BIC"),
  iban: z.string().trim().max(50).optional(),
  accountNumber: z.string().trim().max(40).optional(),
  country: req(2, 80, "Bank country"),
});

type TransferCodes = { imf: string[]; tax: string[]; cot: string[] };
function asCodes(raw: unknown): TransferCodes {
  const v = (raw ?? {}) as Partial<TransferCodes>;
  return { imf: v.imf ?? [], tax: v.tax ?? [], cot: v.cot ?? [] };
}

async function setAuthCookie(state: TransferAuthState): Promise<void> {
  const store = await cookies();
  store.set(TRANSFER_AUTH_COOKIE, encodeTransferAuth(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}
async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(TRANSFER_AUTH_COOKIE);
}
async function readAuthState(): Promise<TransferAuthState | null> {
  const store = await cookies();
  return decodeTransferAuth(store.get(TRANSFER_AUTH_COOKIE)?.value);
}

// Step 1 of the transfer flow: verify the transaction PIN, validate the form, build the
// remaining step sequence (wire codes that are configured + a final OTP), email the OTP, and
// stash the signed authorization session. Returns the first step's route.
export async function beginTransfer(input: SendInput, pin: string): Promise<BeginResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("send_money"))) {
    return { ok: false, error: "Transfers are currently disabled." };
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, controls: true, transferCodes: true, transactionPin: true, email: true, emailVerified: true, kycStatus: true },
  });
  if (!sender) return { ok: false, error: "Account not found." };
  if (!controlAllows(sender.controls, "send_money")) {
    return { ok: false, error: "Transfers are disabled on your account. Please contact support." };
  }
  // Per-type flag. The form only renders enabled tabs, but that's presentation — a crafted
  // payload can still name a disabled type, so the authority is here.
  const kindFlag = TRANSFER_TYPE_FLAGS[input.type as TransferKind];
  if (!kindFlag || !(await isFeatureEnabled(kindFlag))) {
    return { ok: false, error: "That transfer type is currently unavailable." };
  }
  const blocked = requirementBlock(sender);
  if (blocked) return { ok: false, error: blocked };
  if (!sender.transactionPin) {
    return { ok: false, error: "Set up your transaction PIN in Security first.", needPin: true };
  }
  if (!(await verifyTransactionPin(userId, pin))) {
    return { ok: false, error: "Incorrect transaction PIN." };
  }

  const currency = sender.currency ?? "USD";
  let payload: TransferAuthPayload;

  if (input.type === "internal") {
    const parsed = InternalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
    const recipient = await prisma.user.findFirst({
      where: { OR: [{ email: parsed.data.recipient.toLowerCase() }, { username: parsed.data.recipient }] },
      select: { id: true, name: true, role: true },
    });
    if (!recipient || recipient.id === userId || recipient.role === "admin" || recipient.role === "super_admin") {
      return { ok: false, error: "We couldn't find that recipient." };
    }
    payload = {
      type: "internal",
      currency,
      amount: String(parsed.data.amount),
      description: parsed.data.description,
      recipientUserId: recipient.id,
      recipientName: recipient.name,
      recipientLabel: recipient.name,
    };
  } else if (input.type === "domestic") {
    const parsed = DomesticSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
    payload = {
      type: "domestic",
      currency,
      amount: String(parsed.data.amount),
      description: parsed.data.description,
      recipientName: parsed.data.accountName,
      recipientLabel: parsed.data.accountName,
      recipientDetails: {
        bankName: parsed.data.bankName,
        accountName: parsed.data.accountName,
        accountNumber: parsed.data.accountNumber,
        ...(parsed.data.routingNumber ? { routingNumber: parsed.data.routingNumber } : {}),
      },
    };
  } else {
    const parsed = WireSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
    payload = {
      type: "wire",
      currency,
      amount: String(parsed.data.amount),
      description: parsed.data.description,
      recipientName: parsed.data.accountName,
      recipientLabel: parsed.data.accountName,
      recipientDetails: {
        bankName: parsed.data.bankName,
        accountName: parsed.data.accountName,
        swift: parsed.data.swift,
        country: parsed.data.country,
        ...(parsed.data.iban ? { iban: parsed.data.iban } : {}),
        ...(parsed.data.accountNumber ? { accountNumber: parsed.data.accountNumber } : {}),
      },
    };
  }

  // Build the step sequence: wire adds each CONFIGURED code type (empty list = skipped); every
  // transfer ends with an emailed OTP.
  const sequence: TransferStep[] = [];
  if (payload.type === "wire") {
    const codes = asCodes(sender.transferCodes);
    if (codes.imf.length > 0) sequence.push("imf");
    if (codes.tax.length > 0) sequence.push("tax");
    if (codes.cot.length > 0) sequence.push("cot");
  }
  sequence.push("otp");

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await setAuthCookie({
    payload,
    transferId: randomUUID(),
    sequence,
    verified: [],
    otpHash: hashOtp(otp),
    expiresAt: newExpiry(),
  });
  void sendEmail({
    to: sender.email,
    subject: "Your transfer authorization code",
    text: `Your transfer authorization code is ${otp}. It expires in 15 minutes. If you didn't start a transfer, ignore this email.`,
  });

  return { ok: true, next: `/send/verify/${sequence[0]}` };
}

const TRANSFER_LABEL: Record<TransferAuthPayload["type"], string> = {
  internal: "Internal",
  domestic: "Domestic",
  wire: "Wire",
};

// Finalize once every step is cleared: debit the sender on request (held) and create the
// pending Transfer, then clear the session. Mirrors the withdraw hold pattern.
async function finalize(userId: string, state: TransferAuthState): Promise<StepResult> {
  const { payload, transferId } = state;
  const amountMinor = toMinor(Number(payload.amount));
  const txnId = txnCode("TRF");
  const codesVerified = state.sequence.some((s) => s !== "otp") &&
    state.sequence.filter((s) => s !== "otp").every((s) => state.verified.includes(s));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transfer.create({
        data: {
          id: transferId,
          txnId,
          userId,
          type: payload.type,
          currency: payload.currency,
          amountMinor,
          status: "pending",
          recipientUserId: payload.recipientUserId ?? null,
          recipientName: payload.recipientName ?? null,
          recipientDetails: payload.recipientDetails ?? undefined,
          codesVerified,
          description: payload.description ?? null,
        },
      });
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: payload.currency } },
      });
      if (!wallet) throw new Error("NOWALLET");
      const debit = await postLedgerEntry({
        walletId: wallet.id,
        userId,
        currency: payload.currency,
        direction: "debit",
        amountMinor,
        source: "transfer",
        idempotencyKey: `transfer:${transferId}:debit`,
        referenceType: "transfer",
        referenceId: transferId,
        description: `Transfer to ${payload.recipientLabel} (${txnId})`,
        client: tx,
      });
      if (!debit.ok) throw new Error(debit.reason === "insufficient_funds" ? "INSUFFICIENT" : "LEDGER");
      await tx.transfer.update({ where: { id: transferId }, data: { debitTransactionId: debit.id } });
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "NOWALLET") return { ok: false, error: "You have no wallet in this currency." };
    if (message === "INSUFFICIENT") return { ok: false, error: "Insufficient wallet balance for this transfer." };
    return { ok: false, error: "Could not submit the transfer. Please try again." };
  }

  // Best-effort: the transfer + its hold are committed, so a notify failure must never surface as
  // a failed transfer.
  const amountLabel = formatCurrency(toMajor(amountMinor), payload.currency);
  try {
    await notifyAdmins({
      type: "transfer_requested",
      title: "New transfer request",
      message: `${TRANSFER_LABEL[payload.type]} transfer ${txnId} of ${amountLabel} to ${payload.recipientLabel} is pending review.`,
    });

    // Internal transfer: let the recipient know it's coming. The funds are NOT theirs yet — an
    // admin approval is what credits their wallet (app/admin/transfers/actions.ts) — so this says
    // "incoming", not "received", or they'd check a balance that hasn't moved.
    if (payload.recipientUserId) {
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await notifyUserOf(payload.recipientUserId, {
        type: "email",
        title: "Incoming transfer",
        message: `${sender?.name ?? "Someone"} sent you ${amountLabel} (${txnId}) — it will land in your wallet once approved.`,
      });
    }
  } catch {
    // ignored — the admin queue still shows the transfer.
  }

  await clearAuthCookie();
  return { ok: true, next: "/transactions", done: true };
}

// Verify one step of the authorization flow. Enforces order server-side (the step must be the
// next uncleared one), validates the code/OTP, then advances or finalizes.
export async function verifyTransferStep(step: TransferStep, code: string): Promise<StepResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  const state = await readAuthState();
  if (!state) return { ok: false, error: "Your transfer session expired. Please start again." };

  const expected = nextStep(state);
  if (!expected) return { ok: false, error: "Nothing left to verify." };
  if (expected !== step) {
    return { ok: false, error: "Please complete the steps in order." };
  }

  const value = code.trim();
  if (step === "otp") {
    if (!state.otpHash || hashOtp(value) !== state.otpHash) {
      return { ok: false, error: "Incorrect code. Check your email and try again." };
    }
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { transferCodes: true } });
    const codes = asCodes(user?.transferCodes);
    if (!codes[step].includes(value)) {
      return { ok: false, error: `Invalid ${step.toUpperCase()} code. Please contact support to obtain it.` };
    }
  }

  const verified: TransferStep[] = [...state.verified, step];
  const advanced: TransferAuthState = { ...state, verified };

  if (!nextStep(advanced)) {
    return finalize(userId, advanced);
  }
  await setAuthCookie(advanced);
  return { ok: true, next: `/send/verify/${nextStep(advanced)}` };
}

// Regenerate + re-email the OTP (from the OTP step).
export async function resendTransferOtp(): Promise<{ ok: boolean; error?: string }> {
  const { session } = await requireActiveUser();
  const state = await readAuthState();
  if (!state) return { ok: false, error: "Your transfer session expired." };
  if (nextStep(state) !== "otp") return { ok: false, error: "Not at the code step yet." };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await setAuthCookie({ ...state, otpHash: hashOtp(otp), expiresAt: newExpiry() });
  void sendEmail({
    to: session.user.email,
    subject: "Your transfer authorization code",
    text: `Your new transfer authorization code is ${otp}. It expires in 15 minutes.`,
  });
  return { ok: true };
}
