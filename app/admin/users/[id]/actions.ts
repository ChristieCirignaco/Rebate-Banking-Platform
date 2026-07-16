"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAdminSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { postLedgerEntry } from "@/lib/money/ledger";
import { toMajor } from "@/lib/money/money";
import { deliverEmailNotices, notifyUserOf, USER_NOTICE_TYPES } from "@/lib/notifications";
import { addWalletFor, removeWalletFor } from "@/lib/wallets";
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
  // Name / account-status / withdrawal edits here are surfaced on the list too.
  revalidatePath("/admin/users");
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

  // Best-effort notice, post-commit — and only here: the duplicate branch above returns ok
  // without having posted anything this time, so notifying there would re-announce an
  // adjustment the user was already told about.
  await notifyUserOf(userId, {
    title: input.op === "credit" ? "Wallet credited" : "Wallet debited",
    message: `An admin ${input.op === "credit" ? "credited" : "debited"} ${formatCurrency(
      toMajor(amountMinor),
      wallet.currency,
    )} ${input.op === "credit" ? "to" : "from"} your ${wallet.currency} wallet.${
      input.description ? ` Note: ${input.description}` : ""
    }`,
  });
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

  // Read the current values first: re-saving the dialog unchanged is a non-event, and the user
  // shouldn't get a fresh bell notice for it.
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawalStatus: true, withdrawalMessage: true },
  });
  const userMessage = input.userMessage?.trim() || null;
  const changed =
    before?.withdrawalStatus !== input.status || (before?.withdrawalMessage ?? null) !== userMessage;

  await prisma.user.update({
    where: { id: userId },
    data: { withdrawalStatus: input.status, withdrawalMessage: userMessage },
  });

  // Best-effort notice, post-commit. `userMessage` is already an admin-authored message TO
  // this user — persisting it to User.withdrawalMessage never actually delivered it, so send
  // it verbatim when there is one and fall back to stating the new status when there isn't.
  if (changed) {
    await notifyUserOf(userId, {
      title: "Withdrawal status updated",
      message: userMessage || `Your withdrawal status is now "${input.status}".`,
    });
  }
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

  // Validate the same things broadcastNotification does. NotifyPayload's type is compile-time
  // only, and a Server Action's payload is caller-controlled at runtime: without this check an
  // alert type could be written onto a USER's row, which is the one way to violate the invariant
  // the whole audience split rests on (user reads filter to email|push, the admin feed filters to
  // its own userId — such a row would be visible to nobody).
  if (!USER_NOTICE_TYPES.includes(input.type)) {
    return { ok: false, error: "Invalid notification type." };
  }
  if (!input.message?.trim()) return { ok: false, error: "Message is required." };

  let scheduledAt: Date | null = null;
  if (input.scheduleAt) {
    const when = new Date(input.scheduleAt);
    // An unparsed date would reach Prisma as Invalid Date and throw — the dialog call site
    // doesn't try/catch, so that would surface as a crash rather than a message.
    if (Number.isNaN(when.getTime())) return { ok: false, error: "Invalid schedule time." };
    scheduledAt = when;
  }

  await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title ?? null,
      message: input.message,
      scheduledAt,
    },
  });
  // Mail it only when it's an email notice that is due now. A scheduled one is stored and shown
  // in the bell when its time comes, but nothing dispatches on scheduledAt yet — mailing it here
  // would deliver early, which is worse than not mailing at all.
  if (input.type === "email" && !scheduledAt) {
    await deliverEmailNotices([userId], input.title ?? null, input.message);
  }
  revalidate(userId);
  return { ok: true };
}

// Assign an extra wallet to a user. Same cap and currency rules as the user's own /wallet page —
// both go through lib/wallets so admin and user can't drift apart on what "3 wallets max" means.
export async function assignWallet(userId: string, currencyCode: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  const result = await addWalletFor(userId, currencyCode);
  if (result.ok) revalidate(userId);
  return result;
}

// Remove a user's wallet. The guards in lib/wallets are load-bearing here: WalletTransaction
// cascades on wallet delete, so removing a wallet with history would wipe that currency's ledger,
// and removing one with a balance would destroy money. Both are refused, as is the primary or
// the user's last wallet.
export async function removeUserWallet(userId: string, walletId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;
  if (!walletId) return { ok: false, error: "Missing wallet." };

  const result = await removeWalletFor(userId, walletId);
  if (result.ok) revalidate(userId);
  return result;
}
