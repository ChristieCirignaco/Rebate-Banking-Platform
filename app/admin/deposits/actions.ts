"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { postLedgerEntry } from "@/lib/money/ledger";
import { awardReferral } from "@/lib/referrals";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { DepositMethodPayload } from "@/components/admin/deposits/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };

function revalidate() {
  revalidatePath("/admin/deposits");
}

// ----- Manual request review -----

export async function approveDeposit(
  id: string,
  remarks?: string,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const deposit = await prisma.deposit.findUnique({ where: { id } });
  if (!deposit) return { ok: false, error: "Deposit not found." };
  if (deposit.status !== "pending") {
    return { ok: false, error: "This deposit has already been reviewed." };
  }
  if (deposit.amountMinor <= 0n) return { ok: false, error: "Invalid deposit amount." };
  const note = remarks?.trim() || null;

  // Atomic: compare-and-set the status AND post the ledger credit in one transaction, so a
  // concurrent approve/reject can't leave a credited-but-canceled deposit (only one review
  // wins the pending → completed claim), and a crash never leaves them out of sync.
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.deposit.updateMany({
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

      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: deposit.userId, currency: deposit.currency } },
        update: {},
        create: { userId: deposit.userId, currency: deposit.currency, isDefault: false },
      });
      const credit = await postLedgerEntry({
        walletId: wallet.id,
        userId: deposit.userId,
        currency: deposit.currency,
        direction: "credit",
        amountMinor: deposit.amountMinor,
        source: "deposit",
        idempotencyKey: `deposit:${deposit.id}`,
        referenceType: "deposit",
        referenceId: deposit.id,
        provider: deposit.provider,
        description: deposit.description ?? "Deposit approved",
        client: tx,
      });
      if (!credit.ok) throw new Error("LEDGER");
      await tx.deposit.update({ where: { id }, data: { walletTransactionId: credit.id } });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "ALREADY") {
      return { ok: false, error: "This deposit has already been reviewed." };
    }
    return { ok: false, error: "Could not credit the wallet. Please try again." };
  }
  // Referral: award the referrer on the referred user's first completed deposit (idempotent).
  await awardReferral({
    referredUserId: deposit.userId,
    trigger: "first_deposit",
    depositAmountMinor: deposit.amountMinor,
    depositCurrency: deposit.currency,
  });
  revalidate();
  return { ok: true };
}

export async function rejectDeposit(
  id: string,
  remarks?: string,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  // Compare-and-set so it can't clobber a concurrent approval (no ledger effect on reject).
  const claim = await prisma.deposit.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "canceled",
      remarks: remarks?.trim() || null,
      reviewedById: session.user.id,
      reviewedByName: session.user.name,
      reviewedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    const exists = await prisma.deposit.count({ where: { id } });
    return {
      ok: false,
      error: exists ? "This deposit has already been reviewed." : "Deposit not found.",
    };
  }
  revalidate();
  return { ok: true };
}

// ----- Deposit method CRUD -----

const nonNeg = (value: number) => (Number.isFinite(value) && value >= 0 ? value : 0);

function validateMethod(payload: DepositMethodPayload): string | null {
  if (payload.type !== "auto" && payload.type !== "manual") return "Invalid method type.";
  if (!payload.name?.trim()) return "Name is required.";
  if (!payload.symbol?.trim()) return "Currency symbol is required.";
  if (!payload.currencyId) return "Select a currency.";
  if (payload.type === "auto" && !payload.paymentGatewayId) {
    return "Select a payment gateway.";
  }
  if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
    return "Conversion rate must be greater than zero.";
  }
  if (payload.chargeType !== "percent" && payload.chargeType !== "fixed") {
    return "Invalid charge type.";
  }
  if (nonNeg(payload.maxAmount) > 0 && nonNeg(payload.maxAmount) < nonNeg(payload.minAmount)) {
    return "Maximum must be greater than or equal to the minimum.";
  }
  if (payload.chargeType === "percent" && nonNeg(payload.chargeValue) > 100) {
    return "Percentage charge cannot exceed 100%.";
  }
  if (payload.logo) {
    if (payload.logo.length > 400_000) {
      return "Logo image is too large.";
    }
    const dataImage = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(payload.logo);
    if (!dataImage && !payload.logo.startsWith("/")) {
      return "Logo must be an uploaded image.";
    }
  }
  if (payload.type === "manual") {
    for (const field of payload.fields ?? []) {
      if (!field.label?.trim()) return "Each custom field needs a label.";
      if (!["input", "textarea", "file"].includes(field.type)) return "Invalid field type.";
    }
  }
  return null;
}

// The custom fields' min/max/charge are stored as Decimal; keep amounts in major units
// (config thresholds, not ledger money) exactly like the currency-role config.
function methodData(payload: DepositMethodPayload) {
  const isAuto = payload.type === "auto";
  return {
    type: payload.type,
    name: payload.name.trim(),
    symbol: payload.symbol.trim(),
    methodCode: isAuto ? null : payload.methodCode?.trim() || null,
    logo: payload.logo || null,
    currencyId: payload.currencyId,
    paymentGatewayId: isAuto ? payload.paymentGatewayId : null,
    rate: payload.rate,
    chargeType: payload.chargeType,
    chargeValue: nonNeg(payload.chargeValue),
    minAmount: nonNeg(payload.minAmount),
    maxAmount: nonNeg(payload.maxAmount),
    // Admin HTML seeded into a contentEditable later — sanitize the executable surface.
    instructions:
      isAuto || !payload.instructions?.trim()
        ? null
        : sanitizeHtml(payload.instructions.trim()),
    isActive: payload.isActive,
  };
}

function fieldCreateData(payload: DepositMethodPayload) {
  if (payload.type !== "manual") return [];
  return (payload.fields ?? []).map((field, index) => ({
    label: field.label.trim(),
    type: field.type,
    required: field.required,
    sortOrder: index,
  }));
}

async function currencyExists(currencyId: string): Promise<boolean> {
  return (await prisma.currency.count({ where: { id: currencyId } })) > 0;
}

async function gatewayExists(gatewayId: string): Promise<boolean> {
  return (await prisma.paymentGateway.count({ where: { id: gatewayId } })) > 0;
}

// Referenced-model existence checks so a stale/tampered id returns a clean error instead
// of an uncaught foreign-key violation.
async function referencesValid(
  payload: DepositMethodPayload,
): Promise<string | null> {
  if (!(await currencyExists(payload.currencyId))) {
    return "Selected currency no longer exists.";
  }
  if (
    payload.type === "auto" &&
    payload.paymentGatewayId &&
    !(await gatewayExists(payload.paymentGatewayId))
  ) {
    return "Selected payment gateway no longer exists.";
  }
  return null;
}

export async function createDepositMethod(
  payload: DepositMethodPayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const error = validateMethod(payload);
  if (error) return { ok: false, error };
  const refError = await referencesValid(payload);
  if (refError) return { ok: false, error: refError };

  await prisma.depositMethod.create({
    data: { ...methodData(payload), fields: { create: fieldCreateData(payload) } },
  });
  revalidate();
  return { ok: true };
}

export async function updateDepositMethod(
  id: string,
  payload: DepositMethodPayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const error = validateMethod(payload);
  if (error) return { ok: false, error };

  const existing = await prisma.depositMethod.findUnique({
    where: { id },
    select: { id: true, type: true },
  });
  if (!existing) return { ok: false, error: "Method not found." };
  const refError = await referencesValid(payload);
  if (refError) return { ok: false, error: refError };

  await prisma.$transaction(async (tx) => {
    await tx.depositMethod.update({ where: { id }, data: methodData(payload) });
    // Replace the custom-field set wholesale (simplest correct diff for a small list).
    await tx.manualMethodField.deleteMany({ where: { depositMethodId: id } });
    const fields = fieldCreateData(payload);
    if (fields.length > 0) {
      await tx.manualMethodField.createMany({
        data: fields.map((field) => ({ ...field, depositMethodId: id })),
      });
    }
  });
  revalidate();
  return { ok: true };
}

export async function deleteDepositMethod(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const existing = await prisma.depositMethod.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Method not found." };

  // Cascade removes its custom fields; historical deposits keep their denormalized data
  // (the FK is SetNull), so deleting a method never rewrites history.
  await prisma.depositMethod.delete({ where: { id } });
  revalidate();
  return { ok: true };
}

// ----- Deposit history -----

export async function deleteDeposit(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const existing = await prisma.deposit.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Deposit not found." };

  // Removes the deposit ORDER record only. The append-only wallet_transactions ledger
  // (the source of truth for money) is deliberately left untouched.
  await prisma.deposit.delete({ where: { id } });
  revalidate();
  return { ok: true };
}
