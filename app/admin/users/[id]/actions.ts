"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAdminSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { postLedgerEntry } from "@/lib/money/ledger";
import { hashPassword } from "@/lib/password";
import { isValidPin } from "@/lib/transaction-pin";
import { toMajor } from "@/lib/money/money";
import { deliverEmailNotices, notifyUserOf, USER_NOTICE_TYPES } from "@/lib/notifications";
import { addWalletFor, removeWalletFor } from "@/lib/wallets";
import { CONTROL_META } from "@/lib/admin/user-detail";
import { CONTROL_KEYS } from "@/components/admin/users/detail/types";
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

// An avatar we produced: the served URL of an upload from /api/admin/avatar. Anything else is
// refused, so User.image can only ever point at our own media route (mirrors the profile actions).
const AVATAR_URL = /^\/api\/media\/[A-Za-z0-9._-]+$/;

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

  const GENDERS = ["male", "female", "other", "unspecified"] as const;
  if (
    values.gender !== undefined &&
    !GENDERS.includes(values.gender as (typeof GENDERS)[number])
  ) {
    return { ok: false, error: "Invalid gender." };
  }

  // Birthday: an empty string clears it (-> null); a value must be a real, non-future date;
  // an absent key leaves it untouched. (The old `? new Date() : undefined` made a set birthday
  // un-clearable, since Prisma skips undefined.)
  let birthday: Date | null | undefined = undefined;
  if (values.birthday !== undefined) {
    if (values.birthday === "") {
      birthday = null;
    } else {
      const parsed = new Date(values.birthday);
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: "Enter a valid date of birth." };
      }
      if (parsed.getTime() > Date.now()) {
        return { ok: false, error: "Date of birth can't be in the future." };
      }
      birthday = parsed;
    }
  }

  const name = [values.firstName, values.lastName].filter(Boolean).join(" ").trim();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || undefined,
      phone: values.phone,
      gender: values.gender,
      address: values.address,
      birthday,
    },
  });

  // Notified because the user did NOT make this change — the self-service equivalent in
  // account/profile deliberately stays silent, since mailing someone about an edit they just
  // made themselves is noise. Email is not editable from either path, so there's no address
  // change to warn about; this is "someone else touched your details, check them".
  await notifyUserOf(userId, {
    type: "email",
    title: "Profile Details Updated",
    message:
      "Your profile details were updated by our team. Please review them and contact support if anything looks wrong.",
    cta: { label: "Review profile", url: "/account/profile" },
  });

  revalidate(userId);
  return { ok: true };
}

// Set (or clear, with "") a user's avatar from the Information tab. The bytes are already stored
// by /api/admin/avatar, which returns the /api/media/<key> URL persisted here.
export async function adminSetUserAvatar(
  userId: string,
  imageUrl: string,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  const url = imageUrl.trim();
  if (url && !AVATAR_URL.test(url)) return { ok: false, error: "That image isn't valid." };

  await prisma.user.update({ where: { id: userId }, data: { image: url || null } });
  revalidate(userId);
  return { ok: true };
}

// Reactivate a suspended account (e.g. one rejected from the pending queue, which sets status ->
// suspended): status -> active. Only a suspended target is eligible; pending/active accounts are
// left to their own flows. This is the "reactivate later" path the reject dialog promises.
export async function reactivateUser(userId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!target) return { ok: false, error: "User not found." };
  if (target.status !== "suspended") {
    return { ok: false, error: "Only a suspended account can be reactivated." };
  }

  await prisma.user.update({ where: { id: userId }, data: { status: "active" } });

  // A suspended user was locked out with no way to see this change from inside the app, so the
  // mail is the only channel that reaches them.
  await notifyUserOf(userId, {
    type: "email",
    title: "Account Reactivated",
    message: "Your account has been reactivated. You can sign in and use your account again.",
    cta: { label: "Sign in", url: "/login" },
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
  // The key is caller-controlled at runtime — reject anything outside the known set so the
  // controls JSON can't accumulate junk keys that no guard ever reads.
  if (!CONTROL_KEYS.includes(key)) return { ok: false, error: "Invalid control." };
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

  // Only the two directions the user would otherwise discover as an unexplained failure get a
  // mail: a capability switched OFF (the feature stops working) and a requirement switched ON
  // (something new is demanded before they can transact). Restoring a capability or dropping a
  // requirement needs no notice — nothing breaks, and mailing every toggle would train people to
  // ignore these. `account_status` is the one that locks sign-in, so it gets its own wording.
  const meta = CONTROL_META.find((m) => m.key === key);
  const blocks = meta ? (meta.kind === "capability" ? !value : value) : false;
  if (meta && blocks) {
    await notifyUserOf(userId, {
      type: "email",
      title: key === "account_status" ? "Account Access Suspended" : "Account Restriction Applied",
      message:
        key === "account_status"
          ? "Your account has been suspended and you won't be able to sign in. Please contact support if you think this is a mistake."
          : meta.kind === "requirement"
            ? `${meta.label} is now required on your account before you can transact.`
            : `${meta.label} has been disabled on your account.`,
      cta: { label: "Contact support", url: "/support" },
    });
  }

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

  const [wallet, target] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: input.walletCurrency } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
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
  const credited = input.op === "credit";
  const amountLabel = formatCurrency(toMajor(amountMinor), wallet.currency);
  const greetingName = target?.name?.trim() || "Customer";

  // NOTE: neither `input.description` nor `input.adminNote` reaches the user. Both are the
  // admin's own words typed while making the adjustment — internal context for the ledger entry
  // and the admin timeline, not copy to forward to the account holder.
  await notifyUserOf(userId, {
    type: "email",
    title: credited ? "Account Credited" : "Account Debited",
    // `message` is also the in-app bell row, so it has to stand alone — the greeting is
    // email-only, where a bare "Dear X," above the sentence reads right and in the bell wouldn't.
    greeting: `Dear ${greetingName},`,
    message: credited
      ? `Your TRB account has been credited successfully ${amountLabel}.`
      : `Your TRB account has been debited successfully ${amountLabel}.`,
    rows: [
      { label: credited ? "Amount credited" : "Amount debited", value: amountLabel },
      { label: "Wallet", value: wallet.currency },
      {
        label: "New balance",
        value: formatCurrency(toMajor(result.balanceAfterMinor), wallet.currency),
      },
    ],
    cta: { label: "View transactions", url: "/transactions" },
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

  // Sanitize and enforce the rule the dialog advertises ("minimum of 3 codes, or none"): trim,
  // drop empties, then reject any group left with 1 or 2 codes so the stored value matches the
  // promise instead of persisting the payload verbatim.
  const GROUPS = ["imf", "tax", "cot"] as const;
  const sanitized: TransferCodes = { imf: [], tax: [], cot: [] };
  for (const group of GROUPS) {
    const cleaned = (codes?.[group] ?? []).map((code) => code.trim()).filter(Boolean);
    if (cleaned.length > 0 && cleaned.length < 3) {
      return { ok: false, error: `${group.toUpperCase()} needs at least 3 codes, or none.` };
    }
    sanitized[group] = cleaned;
  }

  await prisma.user.update({ where: { id: userId }, data: { transferCodes: sanitized } });

  // The codes themselves are deliberately NOT in this mail. They're a second factor on transfers,
  // and the transfer flow tells the user to obtain them from support — putting them in an inbox
  // would undo both that design and the point of having them. This says only that they changed.
  const groups = (["imf", "tax", "cot"] as const).filter((g) => sanitized[g].length > 0);
  await notifyUserOf(userId, {
    type: "email",
    title: "Transfer Authorization Codes Updated",
    message: groups.length
      ? "Your transfer authorization codes have been updated. Contact support to obtain them when you next authorize a transfer."
      : "Transfer authorization codes are no longer required on your account.",
    cta: { label: "Contact support", url: "/support" },
  });

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
      type: "email",
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

// ---------------------------------------------------------------------------
// Security (admin-managed)
// ---------------------------------------------------------------------------
// These bypass the proofs the user themself must provide — an admin sets a password without the
// old one and a PIN without the current one. That's the point (support resets), but it also means
// each of these is an account-takeover primitive, so they share three mitigations:
//
//   1. assertRegularUserTarget — an admin can never aim these at another admin-tier account.
//   2. Every session is revoked, so the change can't be made quietly around a live attacker (and
//      the real user is forced to re-authenticate with the new credential).
//   3. The user is EMAILED. A silent credential change on a banking account is the thing you
//      never want; if it wasn't them, the mail is how they find out.

export async function adminSetUserPassword(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (newPassword.length > 200) return { ok: false, error: "Password is too long." };

  // Better Auth keeps the password on the credential Account row, not on User. A user who only
  // ever signed in with a social provider has no such row to update.
  const credential = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });
  if (!credential) {
    return { ok: false, error: "This account has no password sign-in to reset." };
  }

  const hashed = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.account.update({ where: { id: credential.id }, data: { password: hashed } });
    // Revoke every session: a password reset must not leave an existing login alive.
    await tx.session.deleteMany({ where: { userId } });
  });

  await notifyUserOf(userId, {
    type: "email",
    title: "Your password was changed",
    message:
      "An administrator set a new password on your account and signed you out everywhere. If you didn't request this, contact support immediately.",
  });
  revalidate(userId);
  return { ok: true };
}

// Set or replace the transaction PIN without knowing the current one (the user's own
// setTransactionPin requires it). Works whether or not they already have one.
export async function adminSetUserPin(userId: string, newPin: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  if (!isValidPin(newPin)) return { ok: false, error: "PIN must be 4–6 digits." };

  // Same hash as the user's own path (lib/transaction-pin verifies against it), so a PIN set
  // here behaves identically to one the user chose.
  const hashed = await hashPassword(newPin);
  await prisma.user.update({ where: { id: userId }, data: { transactionPin: hashed } });

  await notifyUserOf(userId, {
    type: "email",
    title: "Your transaction PIN was changed",
    message:
      "An administrator set a new transaction PIN on your account. If you didn't request this, contact support immediately.",
  });
  revalidate(userId);
  return { ok: true };
}

// Remove the PIN entirely. The user is then prompted to create one at their next money action
// (every action returns needPin when transactionPin is null), so this is the "they forgot it"
// escape hatch rather than a way to disable the gate.
export async function adminClearUserPin(userId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } });
  if (!user?.transactionPin) return { ok: false, error: "This user has no PIN set." };

  await prisma.user.update({ where: { id: userId }, data: { transactionPin: null } });
  await notifyUserOf(userId, {
    type: "email",
    title: "Your transaction PIN was removed",
    message:
      "An administrator removed the transaction PIN on your account. You'll be asked to create a new one the next time you move money.",
  });
  revalidate(userId);
  return { ok: true };
}

// Turn two-factor OFF. There is deliberately no "enable" counterpart: TOTP requires the secret to
// be enrolled on the user's own authenticator app, which an admin cannot do for them. This is the
// lockout escape hatch — the user re-enrols from Security.
export async function adminDisableTwoFactor(userId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  if (!user?.twoFactorEnabled) return { ok: false, error: "Two-factor is not enabled." };

  await prisma.$transaction(async (tx) => {
    await tx.twoFactor.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
  });

  await notifyUserOf(userId, {
    type: "email",
    title: "Two-factor authentication disabled",
    message:
      "An administrator disabled two-factor authentication on your account. You can set it up again from Settings → Security. If you didn't request this, contact support immediately.",
  });
  revalidate(userId);
  return { ok: true };
}

// Sign the user out everywhere without changing a credential.
export async function adminRevokeSessions(userId: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const targetError = await assertRegularUserTarget(userId);
  if (targetError) return targetError;

  const { count } = await prisma.session.deleteMany({ where: { userId } });
  if (count === 0) return { ok: false, error: "This user has no active sessions." };

  // Being signed out everywhere with no explanation reads like a compromise, which is exactly
  // the wrong scare — so say it was us, and give them somewhere to go if it wasn't expected.
  await notifyUserOf(userId, {
    type: "email",
    title: "Signed Out Of All Devices",
    message:
      "You've been signed out of all devices. You can sign in again with your usual password. If you didn't expect this, contact support.",
    cta: { label: "Sign in", url: "/login" },
  });

  revalidate(userId);
  return { ok: true };
}
