"use server";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyUserOf } from "@/lib/notifications";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isValidPin, verifyTransactionPin } from "@/lib/transaction-pin";

export type PinResult = { ok: true } | { ok: false; error: string };
export type PasswordResult = { ok: true } | { ok: false; error: string };

// Set or change the transaction PIN. Changing an existing PIN requires the current one.
export async function setTransactionPin(input: {
  currentPin?: string;
  newPin: string;
  confirmPin: string;
}): Promise<PinResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!isValidPin(input.newPin)) {
    return { ok: false, error: "PIN must be 4–6 digits." };
  }
  if (input.newPin !== input.confirmPin) {
    return { ok: false, error: "The PINs don't match." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { transactionPin: true },
  });
  if (user?.transactionPin) {
    if (!input.currentPin || !(await verifyTransactionPin(userId, input.currentPin))) {
      return { ok: false, error: "Your current PIN is incorrect." };
    }
  }

  const hashed = await hashPassword(input.newPin);
  await prisma.user.update({ where: { id: userId }, data: { transactionPin: hashed } });
  return { ok: true };
}

// Change your own password. Requires the current one — unlike adminSetUserPassword, which
// deliberately doesn't, because an admin is acting FOR a user who has lost access. Here the
// holder of the session is claiming to be the owner, and a live session is not proof of that
// (an unattended laptop is enough). The current password is what authorizes the change.
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<PasswordResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (typeof input.newPassword !== "string" || input.newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (input.newPassword.length > 200) return { ok: false, error: "Password is too long." };
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, error: "The passwords don't match." };
  }

  // Better Auth keeps the password on the credential Account row, not on User.
  const credential = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true, password: true },
  });
  if (!credential?.password) {
    return { ok: false, error: "This account has no password sign-in to change." };
  }
  if (!(await verifyPassword({ hash: credential.password, password: input.currentPassword }))) {
    return { ok: false, error: "Your current password is incorrect." };
  }
  if (input.currentPassword === input.newPassword) {
    return { ok: false, error: "Choose a password different from your current one." };
  }

  const hashedPassword = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.account.update({ where: { id: credential.id }, data: { password: hashedPassword } });
    // Revoke every OTHER session but keep this one. Signing out the other devices is the point
    // of changing a password you think is compromised; signing out the person doing it just
    // punishes them for it. The admin path deletes all sessions instead, correctly — there the
    // owner isn't the one at the keyboard.
    await tx.session.deleteMany({ where: { userId, NOT: { id: session.session.id } } });
  });

  // Best-effort, and after the commit: the password is already changed, so a mail failure must
  // not report the change as failed.
  await notifyUserOf(userId, {
    type: "email",
    title: "Your password was changed",
    message:
      "Your password was just changed and any other signed-in devices were logged out. If this wasn't you, contact support immediately.",
  });
  return { ok: true };
}
