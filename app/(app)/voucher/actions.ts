"use server";

import { randomInt, randomUUID } from "node:crypto";

import { requireActiveUser } from "@/lib/auth-guards";
import { controlAllows } from "@/lib/controls";
import { requirementBlock } from "@/lib/user-gates";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { notifyUserOf } from "@/lib/notifications";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMajor, toMinor } from "@/lib/money/money";
import { AmountSchema } from "@/lib/money/txn";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { isValidVoucherCode, normalizeVoucherCode, VOUCHER_PREFIX } from "@/lib/voucher-code";

export type GenerateVoucherInput = { walletId: string; amount: string };
export type VoucherActionResult = { ok: true; message: string } | { ok: false; error: string };

const VOUCHER_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return VOUCHER_PREFIX + s;
}

// A code not already in use. The space (36^8) makes collisions astronomically rare; the retry +
// the unique index are just belt-and-braces.
async function uniqueVoucherCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    if ((await prisma.voucher.count({ where: { code } })) === 0) return code;
  }
  throw new Error("Could not allocate a voucher code.");
}

// Generate a voucher from one of the user's wallets. Debits amount + fee (fee kept by the
// platform) and mints a unique code; the voucher holds `amount` in the wallet's currency. Fee
// comes from the admin per-currency "voucher" CurrencyRole. Fail-closed on the voucher flag +
// per-user control. Amounts recomputed server-side.
export async function generateVoucher(input: GenerateVoucherInput): Promise<VoucherActionResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("voucher"))) {
    return { ok: false, error: "Vouchers are currently disabled." };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, emailVerified: true, kycStatus: true },
  });
  if (!user) return { ok: false, error: "Account not found." };
  if (!controlAllows(user.controls, "voucher")) {
    return { ok: false, error: "Vouchers are disabled on your account. Please contact support." };
  }
  const blocked = requirementBlock(user);
  if (blocked) return { ok: false, error: blocked };

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

  const currency = await prisma.currency.findFirst({
    where: { code: wallet.currency, isActive: true },
    select: {
      rate: true,
      roles: {
        where: { role: "voucher" },
        select: { feeType: true, feeValue: true, minAmount: true, maxAmount: true, enabled: true },
      },
    },
  });
  if (!currency) return { ok: false, error: "This currency isn't available for vouchers right now." };

  const vr = currency.roles[0];
  const active = vr && vr.enabled !== false;
  const feeType = vr?.feeType === "fixed" ? "fixed" : "percent";
  const feeValue = active ? Number(vr.feeValue) : 0;
  const minAmount = active ? Number(vr.minAmount) : 0;
  const maxAmount = active ? Number(vr.maxAmount) : 0;
  if (minAmount > 0 && amountMajor < minAmount) {
    return { ok: false, error: `Minimum voucher amount is ${formatCurrency(minAmount, wallet.currency)}.` };
  }
  if (maxAmount > 0 && amountMajor > maxAmount) {
    return { ok: false, error: `Maximum voucher amount is ${formatCurrency(maxAmount, wallet.currency)}.` };
  }

  const feeMajor = feeType === "percent" ? (amountMajor * feeValue) / 100 : feeValue;
  const amountMinor = toMinor(amountMajor);
  const feeMinor = toMinor(Math.max(0, feeMajor));
  const payableMinor = amountMinor + feeMinor;
  if (wallet.balanceMinor < payableMinor) {
    return { ok: false, error: "Insufficient balance for the voucher amount plus fee." };
  }

  const voucherId = randomUUID();
  let code: string;
  try {
    code = await uniqueVoucherCode();
  } catch {
    return { ok: false, error: "Could not generate the voucher. Please try again." };
  }
  const expiresAt = new Date(Date.now() + VOUCHER_TTL_MS);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.voucher.create({
        data: {
          id: voucherId,
          code,
          creatorId: userId,
          currency: wallet.currency,
          amountMinor,
          feeMinor,
          rate: Number(currency.rate),
          status: "pending",
          expiresAt,
        },
      });
      const debit = await postLedgerEntry({
        walletId: wallet.id,
        userId,
        currency: wallet.currency,
        direction: "debit",
        amountMinor: payableMinor,
        source: "voucher",
        idempotencyKey: `voucher:${voucherId}:debit`,
        referenceType: "voucher",
        referenceId: voucherId,
        description: `Voucher ${code}`,
        client: tx,
      });
      if (!debit.ok) throw new Error(debit.reason === "insufficient_funds" ? "INSUFFICIENT" : "LEDGER");
      await tx.voucher.update({ where: { id: voucherId }, data: { debitTransactionId: debit.id } });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "INSUFFICIENT") {
      return { ok: false, error: "Insufficient balance for the voucher amount plus fee." };
    }
    return { ok: false, error: "Could not generate the voucher. Please try again." };
  }

  // The wallet is already debited — tell the user. Best-effort (notifyUserOf swallows its own
  // errors), so it can never undo a minted voucher.
  await notifyUserOf(userId, {
    title: "Voucher created",
    message: `Your voucher ${code} for ${formatCurrency(amountMajor, wallet.currency)} is ready to share.`,
  });

  return {
    ok: true,
    message: `Voucher ${code} created for ${formatCurrency(amountMajor, wallet.currency)}.`,
  };
}

// Redeem a voucher code — any signed-in user can redeem a valid pending code. Credits the
// redeemer's wallet in the voucher's currency (created if needed) and flips pending → redeemed.
export async function redeemVoucher(rawCode: string): Promise<VoucherActionResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("voucher"))) {
    return { ok: false, error: "Vouchers are currently disabled." };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, name: true, emailVerified: true, kycStatus: true },
  });
  if (!user) return { ok: false, error: "Account not found." };
  if (!controlAllows(user.controls, "voucher")) {
    return { ok: false, error: "Vouchers are disabled on your account. Please contact support." };
  }
  const blocked = requirementBlock(user);
  if (blocked) return { ok: false, error: blocked };

  const code = normalizeVoucherCode(rawCode);
  if (!isValidVoucherCode(code)) return { ok: false, error: "Enter a valid voucher code." };

  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher) return { ok: false, error: "Invalid voucher code." };
  if (voucher.status === "redeemed") {
    return { ok: false, error: "This voucher has already been redeemed." };
  }
  if (voucher.status !== "pending") return { ok: false, error: "This voucher is no longer valid." };
  if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
    await prisma.voucher.updateMany({
      where: { id: voucher.id, status: "pending" },
      data: { status: "expired" },
    });
    return { ok: false, error: "This voucher has expired." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.voucher.updateMany({
        where: { id: voucher.id, status: "pending" },
        data: {
          status: "redeemed",
          redeemedById: userId,
          redeemedByName: user.name,
          redeemedAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: voucher.currency } },
        update: {},
        create: { userId, currency: voucher.currency, isDefault: false },
      });
      const credit = await postLedgerEntry({
        walletId: wallet.id,
        userId,
        currency: voucher.currency,
        direction: "credit",
        amountMinor: voucher.amountMinor,
        source: "voucher",
        idempotencyKey: `voucher:${voucher.id}:credit`,
        referenceType: "voucher",
        referenceId: voucher.id,
        description: `Voucher ${voucher.code} redeemed`,
        client: tx,
      });
      if (!credit.ok) throw new Error("LEDGER");
      await tx.voucher.update({ where: { id: voucher.id }, data: { creditTransactionId: credit.id } });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "ALREADY") {
      return { ok: false, error: "This voucher has already been redeemed." };
    }
    return { ok: false, error: "Could not redeem the voucher. Please try again." };
  }

  // The credit is committed. Both notices are best-effort (notifyUserOf swallows its own errors).
  const amountLabel = formatCurrency(toMajor(voucher.amountMinor), voucher.currency);
  await notifyUserOf(userId, {
    title: "Voucher redeemed",
    message: `You redeemed voucher ${voucher.code} for ${amountLabel} into your ${voucher.currency} wallet.`,
  });
  // Tell the creator their voucher was used — skipped when they redeemed it themselves, which is
  // allowed and would otherwise show them the same event twice.
  if (voucher.creatorId !== userId) {
    await notifyUserOf(voucher.creatorId, {
      title: "Your voucher was redeemed",
      message: `${user.name} redeemed your voucher ${voucher.code} for ${amountLabel}.`,
    });
  }

  return {
    ok: true,
    message: `Redeemed ${formatCurrency(toMajor(voucher.amountMinor), voucher.currency)} into your ${voucher.currency} wallet.`,
  };
}
