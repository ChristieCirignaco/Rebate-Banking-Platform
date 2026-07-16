"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMinor } from "@/lib/money/money";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";

export type SendInput = {
  type: "internal" | "domestic" | "wire";
  amount: string;
  description?: string;
  recipient?: string; // internal: email or @username
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swift?: string;
  iban?: string;
  country?: string;
  imf?: string; // wire codes
  tax?: string;
  cot?: string;
};
export type SendResult = { ok: true; txnId: string } | { ok: false; error: string };

const AmountSchema = z.coerce
  .number({ message: "Enter a valid amount." })
  .positive("Amount must be greater than 0.")
  .max(1_000_000_000, "Amount is too large.");

const s = (min = 1, max = 120, label = "This field") =>
  z.string().trim().min(min, `${label} is required.`).max(max);

const InternalSchema = z.object({
  amount: AmountSchema,
  description: z.string().trim().max(200).optional(),
  recipient: s(3, 120, "Recipient").transform((v) => v.replace(/^@/, "")),
});
const DomesticSchema = z.object({
  amount: AmountSchema,
  description: z.string().trim().max(200).optional(),
  bankName: s(2, 120, "Bank name"),
  accountName: s(2, 120, "Account name"),
  accountNumber: s(4, 40, "Account number"),
  routingNumber: z.string().trim().max(40).optional(),
});
const WireSchema = z.object({
  amount: AmountSchema,
  description: z.string().trim().max(200).optional(),
  bankName: s(2, 120, "Bank name"),
  accountName: s(2, 120, "Account name"),
  swift: s(6, 20, "SWIFT / BIC"),
  iban: z.string().trim().max(50).optional(),
  accountNumber: z.string().trim().max(40).optional(),
  country: s(2, 80, "Country"),
  imf: s(1, 40, "IMF code"),
  tax: s(1, 40, "TAX code"),
  cot: s(1, 40, "COT code"),
});

type TransferCodes = { imf: string[]; tax: string[]; cot: string[] };
function asCodes(raw: unknown): TransferCodes {
  const v = (raw ?? {}) as Partial<TransferCodes>;
  return { imf: v.imf ?? [], tax: v.tax ?? [], cot: v.cot ?? [] };
}
function controlAllows(raw: unknown, key: string): boolean {
  if (!raw || typeof raw !== "object") return true; // absent = allowed (override-only)
  const value = (raw as Record<string, unknown>)[key];
  return value !== false;
}

function txnCode(): string {
  return `TRF-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

// Create a transfer as the signed-in user. Debits the sender on request (held), like a
// withdrawal, and posts as `pending` for admin review. Internal resolves the recipient user;
// domestic/wire capture external bank details; wire additionally clears the IMF→TAX→COT code
// gate against the admin-set codes on the account. Gated on the send_money flag + the per-user
// control + an active account, all fail-closed.
export async function createTransfer(input: SendInput): Promise<SendResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("send_money"))) {
    return { ok: false, error: "Transfers are currently disabled." };
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, controls: true, transferCodes: true },
  });
  if (!sender) return { ok: false, error: "Account not found." };
  if (!controlAllows(sender.controls, "send_money")) {
    return { ok: false, error: "Transfers are disabled on your account. Please contact support." };
  }

  const type = input.type;
  let recipientUserId: string | null = null;
  let recipientName: string | null = null;
  let recipientDetails: Record<string, string> | null = null;
  let recipientLabel = "recipient";
  let codesVerified = false;
  let amountMajor: number;
  let description: string | undefined;

  if (type === "internal") {
    const parsed = InternalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
    amountMajor = parsed.data.amount;
    description = parsed.data.description;
    const id = parsed.data.recipient;
    const recipient = await prisma.user.findFirst({
      where: { OR: [{ email: id.toLowerCase() }, { username: id }] },
      select: { id: true, name: true, role: true },
    });
    if (
      !recipient ||
      recipient.id === userId ||
      recipient.role === "admin" ||
      recipient.role === "super_admin"
    ) {
      return { ok: false, error: "We couldn't find that recipient. Check the email or username." };
    }
    recipientUserId = recipient.id;
    recipientName = recipient.name;
    recipientLabel = recipient.name;
  } else if (type === "domestic") {
    const parsed = DomesticSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
    amountMajor = parsed.data.amount;
    description = parsed.data.description;
    recipientName = parsed.data.accountName;
    recipientLabel = parsed.data.accountName;
    recipientDetails = {
      bankName: parsed.data.bankName,
      accountName: parsed.data.accountName,
      accountNumber: parsed.data.accountNumber,
      ...(parsed.data.routingNumber ? { routingNumber: parsed.data.routingNumber } : {}),
    };
  } else {
    const parsed = WireSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
    amountMajor = parsed.data.amount;
    description = parsed.data.description;

    // Wire code gate: each code must match one the admin set on this account, in order.
    const codes = asCodes(sender.transferCodes);
    if (!codes.imf.includes(parsed.data.imf)) {
      return { ok: false, error: "Invalid IMF code. Please contact support to obtain it." };
    }
    if (!codes.tax.includes(parsed.data.tax)) {
      return { ok: false, error: "Invalid TAX code. Please contact support to obtain it." };
    }
    if (!codes.cot.includes(parsed.data.cot)) {
      return { ok: false, error: "Invalid COT code. Please contact support to obtain it." };
    }
    codesVerified = true;
    recipientName = parsed.data.accountName;
    recipientLabel = parsed.data.accountName;
    recipientDetails = {
      bankName: parsed.data.bankName,
      accountName: parsed.data.accountName,
      swift: parsed.data.swift,
      country: parsed.data.country,
      ...(parsed.data.iban ? { iban: parsed.data.iban } : {}),
      ...(parsed.data.accountNumber ? { accountNumber: parsed.data.accountNumber } : {}),
    };
  }

  const currency = sender.currency ?? "USD";
  const amountMinor = toMinor(amountMajor);
  const transferId = randomUUID();
  const txnId = txnCode();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transfer.create({
        data: {
          id: transferId,
          txnId,
          userId,
          type,
          currency,
          amountMinor,
          status: "pending",
          recipientUserId,
          recipientName,
          recipientDetails: recipientDetails ?? undefined,
          codesVerified,
          description: description ?? null,
        },
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      });
      if (!wallet) throw new Error("NOWALLET");

      const debit = await postLedgerEntry({
        walletId: wallet.id,
        userId,
        currency,
        direction: "debit",
        amountMinor,
        source: "transfer",
        idempotencyKey: `transfer:${transferId}:debit`,
        referenceType: "transfer",
        referenceId: transferId,
        description: `Transfer to ${recipientLabel} (${txnId})`,
        client: tx,
      });
      if (!debit.ok) {
        throw new Error(debit.reason === "insufficient_funds" ? "INSUFFICIENT" : "LEDGER");
      }
      await tx.transfer.update({ where: { id: transferId }, data: { debitTransactionId: debit.id } });
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "NOWALLET") return { ok: false, error: "You have no wallet in this currency." };
    if (message === "INSUFFICIENT") {
      return { ok: false, error: "Insufficient wallet balance for this transfer." };
    }
    return { ok: false, error: "Could not submit the transfer. Please try again." };
  }

  return { ok: true, txnId };
}
