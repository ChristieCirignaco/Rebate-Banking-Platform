"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { methodFieldCreateData, validateMethodFields } from "@/lib/method-fields";
import { postLedgerEntry } from "@/lib/money/ledger";
import {
  getWithdrawHistory,
  type WithdrawHistoryParams,
  type WithdrawHistoryResult,
} from "@/lib/admin/withdrawals";
import type {
  WithdrawMethodPayload,
  WithdrawScheduleDay,
} from "@/components/admin/withdrawals/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };
const PROCESS_UNITS = ["minute", "hour", "day"];

function revalidate() {
  revalidatePath("/admin/withdrawals");
}

// ----- Manual request review -----

export async function approveWithdraw(
  id: string,
  remarks?: string,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const withdraw = await prisma.withdraw.findUnique({ where: { id } });
  if (!withdraw) return { ok: false, error: "Withdrawal not found." };
  if (withdraw.status !== "pending") {
    return { ok: false, error: "This withdrawal has already been reviewed." };
  }
  if (withdraw.amountMinor <= 0n) return { ok: false, error: "Invalid withdrawal amount." };
  const note = remarks?.trim() || null;

  // Atomic compare-and-set + ledger. The request usually already held the funds; if not,
  // debit now inside the same transaction (overdraw-guarded) so status and ledger can't
  // diverge and only one reviewer wins the pending → completed claim.
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.withdraw.updateMany({
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

      if (!withdraw.heldTransactionId) {
        const wallet = await tx.wallet.findUnique({
          where: {
            userId_currency: { userId: withdraw.userId, currency: withdraw.currency },
          },
        });
        if (!wallet) throw new Error("NOWALLET");
        const debit = await postLedgerEntry({
          walletId: wallet.id,
          userId: withdraw.userId,
          currency: withdraw.currency,
          direction: "debit",
          amountMinor: withdraw.amountMinor,
          source: "withdrawal",
          idempotencyKey: `withdrawal:${withdraw.id}`,
          referenceType: "withdrawal",
          referenceId: withdraw.id,
          provider: withdraw.provider,
          description: withdraw.description ?? "Withdrawal processed",
          client: tx,
        });
        if (!debit.ok) {
          throw new Error(debit.reason === "insufficient_funds" ? "INSUFFICIENT" : "LEDGER");
        }
        await tx.withdraw.update({ where: { id }, data: { heldTransactionId: debit.id } });
      }
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "ALREADY") {
      return { ok: false, error: "This withdrawal has already been reviewed." };
    }
    if (message === "NOWALLET") {
      return { ok: false, error: "User has no wallet in this currency." };
    }
    if (message === "INSUFFICIENT") {
      return { ok: false, error: "Insufficient wallet balance to process this withdrawal." };
    }
    return { ok: false, error: "Could not process the withdrawal. Please try again." };
  }
  revalidate();
  return { ok: true };
}

export async function rejectWithdraw(
  id: string,
  remarks?: string,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const withdraw = await prisma.withdraw.findUnique({ where: { id } });
  if (!withdraw) return { ok: false, error: "Withdrawal not found." };
  if (withdraw.status !== "pending") {
    return { ok: false, error: "This withdrawal has already been reviewed." };
  }
  const note = remarks?.trim() || null;

  // Atomic: claim the row, then refund the held funds (idempotent reversal credit) in the
  // same transaction. If nothing was held, there's nothing to return.
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.withdraw.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "canceled",
          remarks: note,
          reviewedById: session.user.id,
          reviewedByName: session.user.name,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");

      if (withdraw.heldTransactionId && !withdraw.refundTransactionId) {
        const wallet = await tx.wallet.upsert({
          where: {
            userId_currency: { userId: withdraw.userId, currency: withdraw.currency },
          },
          update: {},
          create: { userId: withdraw.userId, currency: withdraw.currency, isDefault: false },
        });
        const refund = await postLedgerEntry({
          walletId: wallet.id,
          userId: withdraw.userId,
          currency: withdraw.currency,
          direction: "credit",
          amountMinor: withdraw.amountMinor,
          source: "withdrawal_reversal",
          idempotencyKey: `withdrawal_reversal:${withdraw.id}`,
          referenceType: "withdrawal",
          referenceId: withdraw.id,
          description: "Withdrawal refund (rejected)",
          client: tx,
        });
        if (!refund.ok) throw new Error("LEDGER");
        await tx.withdraw.update({ where: { id }, data: { refundTransactionId: refund.id } });
      }
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "ALREADY") {
      return { ok: false, error: "This withdrawal has already been reviewed." };
    }
    return { ok: false, error: "Could not refund the held funds. Please try again." };
  }
  revalidate();
  return { ok: true };
}

// ----- Withdraw method CRUD -----

const nonNeg = (value: number) => (Number.isFinite(value) && value >= 0 ? value : 0);

function validateMethod(payload: WithdrawMethodPayload): string | null {
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
  if (
    payload.processTimeUnit != null &&
    !PROCESS_UNITS.includes(payload.processTimeUnit)
  ) {
    return "Invalid process-time unit.";
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
    const fieldError = validateMethodFields(payload.fields);
    if (fieldError) return fieldError;
  }
  return null;
}

function methodData(payload: WithdrawMethodPayload) {
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
    processTimeValue:
      isAuto || payload.processTimeValue == null
        ? null
        : Math.max(0, Math.round(payload.processTimeValue)),
    processTimeUnit: isAuto ? null : payload.processTimeUnit,
    isActive: payload.isActive,
  };
}

function fieldCreateData(payload: WithdrawMethodPayload) {
  if (payload.type !== "manual") return [];
  return methodFieldCreateData(payload.fields);
}

async function referencesValid(
  payload: WithdrawMethodPayload,
): Promise<string | null> {
  if ((await prisma.currency.count({ where: { id: payload.currencyId } })) === 0) {
    return "Selected currency no longer exists.";
  }
  if (payload.type === "auto" && payload.paymentGatewayId) {
    const gateway = await prisma.paymentGateway.findUnique({
      where: { id: payload.paymentGatewayId },
      select: { withdrawAvailable: true },
    });
    if (!gateway) return "Selected payment gateway no longer exists.";
    if (!gateway.withdrawAvailable) {
      return "Selected payment gateway can't process withdrawals.";
    }
  }
  return null;
}

export async function createWithdrawMethod(
  payload: WithdrawMethodPayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const error = validateMethod(payload);
  if (error) return { ok: false, error };
  const refError = await referencesValid(payload);
  if (refError) return { ok: false, error: refError };

  await prisma.withdrawMethod.create({
    data: { ...methodData(payload), fields: { create: fieldCreateData(payload) } },
  });
  revalidate();
  return { ok: true };
}

export async function updateWithdrawMethod(
  id: string,
  payload: WithdrawMethodPayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const error = validateMethod(payload);
  if (error) return { ok: false, error };

  const existing = await prisma.withdrawMethod.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Method not found." };
  const refError = await referencesValid(payload);
  if (refError) return { ok: false, error: refError };

  await prisma.$transaction(async (tx) => {
    await tx.withdrawMethod.update({ where: { id }, data: methodData(payload) });
    await tx.withdrawMethodField.deleteMany({ where: { withdrawMethodId: id } });
    const fields = fieldCreateData(payload);
    if (fields.length > 0) {
      await tx.withdrawMethodField.createMany({
        data: fields.map((field) => ({ ...field, withdrawMethodId: id })),
      });
    }
  });
  revalidate();
  return { ok: true };
}

export async function deleteWithdrawMethod(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const existing = await prisma.withdrawMethod.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Method not found." };

  await prisma.withdrawMethod.delete({ where: { id } });
  revalidate();
  return { ok: true };
}

// ----- Weekly schedule -----

export async function updateWithdrawSchedule(
  days: WithdrawScheduleDay[],
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const valid = days.filter(
    (day) => Number.isInteger(day.day) && day.day >= 0 && day.day <= 6,
  );

  await prisma.$transaction(
    valid.map((day) =>
      prisma.withdrawScheduleDay.upsert({
        where: { day: day.day },
        update: { enabled: day.enabled },
        create: { day: day.day, enabled: day.enabled },
      }),
    ),
  );
  revalidate();
  return { ok: true };
}

// ----- History -----

// Server-driven, paginated history list (called by the client tab per page/filter change,
// keeping tab switching client-side while paging stays on the server).
export async function listWithdrawHistory(
  params: WithdrawHistoryParams,
): Promise<WithdrawHistoryResult> {
  if (!(await getAdminSession())) {
    return { rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
  return getWithdrawHistory(params);
}

export async function deleteWithdraw(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const existing = await prisma.withdraw.findUnique({
    where: { id },
    select: { id: true, status: true, heldTransactionId: true, refundTransactionId: true },
  });
  if (!existing) return { ok: false, error: "Withdrawal not found." };

  // Deleting the order record must never strand held funds. A pending withdrawal still
  // holds a debit that only reject can refund; completed funds legitimately left the
  // wallet; a canceled one has already been refunded — so only refuse the unresolved cases.
  if (existing.status === "pending") {
    return { ok: false, error: "Reject or approve this withdrawal before deleting it." };
  }
  if (
    existing.heldTransactionId &&
    !existing.refundTransactionId &&
    existing.status !== "completed"
  ) {
    return { ok: false, error: "This withdrawal still holds funds that were never refunded." };
  }

  // Removes the ORDER record only; the wallet ledger (source of truth) is left untouched.
  await prisma.withdraw.delete({ where: { id } });
  revalidate();
  return { ok: true };
}
