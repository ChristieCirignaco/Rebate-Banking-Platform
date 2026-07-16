import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

// The transaction PIN gates every transfer (the first step of the money-move flow). Stored
// argon2id-hashed like a password; never returned to the client.

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hasTransactionPin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { transactionPin: true },
  });
  return Boolean(user?.transactionPin);
}

export async function verifyTransactionPin(userId: string, pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { transactionPin: true },
  });
  if (!user?.transactionPin) return false;
  return verifyPassword({ hash: user.transactionPin, password: pin });
}
