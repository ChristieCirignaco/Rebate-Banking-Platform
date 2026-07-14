"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAdminSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { postLedgerEntry } from "@/lib/money/ledger";
import type {
  ControlKey,
  ManageFundsPayload,
  NotifyPayload,
  TransferCodes,
  UserDetail,
  WithdrawalControlPayload,
} from "@/components/admin/users/detail/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };
const NOT_ADMIN_TARGET: ActionResult = {
  ok: false,
  error: "Manage this account from /admin/users/admin instead.",
};

function revalidate(userId: string) {
  revalidatePath(`/admin/users/${userId}`);
}

// This whole action file is scoped to REGULAR users only — admin-tier accounts are
// managed exclusively at /admin/users/admin (with its own super_admin-only gate and
// sensitive-field lock). Every action re-checks the target's role directly, independent
// of getUserDetailData()'s page-level "not found" guard, since an action can be called
// without ever rendering the page.
async function assertRegularUserTarget(userId: string): Promise<ActionResult | null> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { ok: false, error: "User not found." };
  if (isAdminTierRole(target.role)) return NOT_ADMIN_TARGET;
  return null;
}

export async function updateUserInfo(
  userId: string,
  values: Partial<UserDetail>,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;
  const name = [values.firstName, values.lastName].filter(Boolean).join(" ").trim();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || undefined,
      phone: values.phone,
      gender: values.gender,
      address: values.address,
      birthday: values.birthday ? new Date(values.birthday) : undefined,
    },
  });
  revalidate(userId);
  return { ok: true };
}

export async function toggleControl(
  userId: string,
  key: ControlKey,
  value: boolean,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, role: true },
  });
  if (!user) return { ok: false, error: "User not found." };
  if (isAdminTierRole(user.role)) return NOT_ADMIN_TARGET;
  const controls =
    user.controls && typeof user.controls === "object"
      ? { ...(user.controls as Record<string, boolean>) }
      : {};
  controls[key] = value;
  await prisma.user.update({ where: { id: userId }, data: { controls } });
  revalidate(userId);
  return { ok: true };
}

export async function manageFunds(
  userId: string,
  input: ManageFundsPayload,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  if (!Number.isFinite(input.amount)) return { ok: false, error: "Amount is invalid." };

  const wallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency: input.walletCurrency } },
  });
  if (!wallet) return { ok: false, error: "Wallet not found." };

  const amountMinor = BigInt(Math.round(input.amount * 100));
  if (amountMinor <= 0n) return { ok: false, error: "Amount must be greater than zero." };

  // The request nonce is the idempotency key, so an accidental retry of the same
  // submit posts at most once. A fresh nonce (falls back to a random one) means a
  // deliberate new adjustment always posts.
  const requestId = input.requestId || randomUUID();

  const result = await postLedgerEntry({
    walletId: wallet.id,
    userId,
    currency: wallet.currency,
    direction: input.op === "credit" ? "credit" : "debit",
    amountMinor,
    source: "adjustment",
    idempotencyKey: `adjustment:${requestId}`,
    referenceType: "admin",
    referenceId: session.user.id,
    description: input.description || `Admin ${input.op}`,
    memo: input.adminNote,
  });

  if (!result.ok) {
    // A duplicate means this exact adjustment already posted — the intended effect
    // is in place, so report success rather than tempting the admin to retry.
    if (result.reason === "duplicate") {
      revalidate(userId);
      return { ok: true };
    }
    return {
      ok: false,
      error:
        result.reason === "insufficient_funds"
          ? "Insufficient balance for this debit."
          : "Could not update balance.",
    };
  }
  revalidate(userId);
  return { ok: true };
}

export async function saveTransferCodes(
  userId: string,
  codes: TransferCodes,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;
  await prisma.user.update({ where: { id: userId }, data: { transferCodes: codes } });
  revalidate(userId);
  return { ok: true };
}

export async function updateWithdrawalControl(
  userId: string,
  input: WithdrawalControlPayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;
  await prisma.user.update({
    where: { id: userId },
    data: { withdrawalStatus: input.status, withdrawalMessage: input.userMessage ?? null },
  });
  revalidate(userId);
  return { ok: true };
}

// Cross-imported by other admin sections (KYC review, support tickets) to notify their
// own end users — always a regular-user id in those call sites, so this guard never
// affects them; it only blocks the case this file's target is admin-tier.
export async function notifyUser(userId: string, input: NotifyPayload): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;
  await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title ?? null,
      message: input.message,
      scheduledAt: input.scheduleAt ? new Date(input.scheduleAt) : null,
    },
  });
  revalidate(userId);
  return { ok: true };
}
