import { prisma } from "@/lib/db";

// The user's wallets in the canonical order (default first, then alphabetical by currency) —
// the identical query the deposit/request/exchange/voucher read layers each ran inline.
export function loadUserWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
  });
}
