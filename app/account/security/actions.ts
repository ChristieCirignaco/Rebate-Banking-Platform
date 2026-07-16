"use server";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isValidPin, verifyTransactionPin } from "@/lib/transaction-pin";

export type PinResult = { ok: true } | { ok: false; error: string };

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
