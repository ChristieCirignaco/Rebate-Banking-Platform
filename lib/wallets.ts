import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings/store";

// The user's wallets in the canonical order (default first, then alphabetical by currency) —
// the identical query the deposit/request/exchange/voucher read layers each ran inline.
export function loadUserWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
  });
}

// A user holds their primary wallet (created at signup, in the configured default currency)
// plus up to two optional extras, added by themselves or assigned by an admin. Both surfaces
// go through this module so the cap and the delete guards can't diverge.
export const MAX_WALLETS = 3;
export const MIN_WALLETS = 1;

export type WalletMutationResult = { ok: true } | { ok: false; error: string };

// The currency backing every user's primary wallet: Settings → General → defaultCurrency,
// falling back to USD exactly like the signup hook does (lib/auth.ts).
export async function defaultWalletCurrency(): Promise<string> {
  const general = await getSettings("general");
  const code = (general.defaultCurrency || "USD").toUpperCase();
  const currency = await prisma.currency.findFirst({
    where: { code, isActive: true },
    select: { code: true },
  });
  return currency?.code ?? "USD";
}

// Active currencies the user has no wallet in yet — what an "add wallet" picker offers.
export async function addableCurrencies(
  userId: string,
): Promise<{ code: string; name: string }[]> {
  const held = await prisma.wallet.findMany({ where: { userId }, select: { currency: true } });
  const codes = held.map((w) => w.currency);
  return prisma.currency.findMany({
    where: { isActive: true, code: { notIn: codes.length ? codes : ["__none__"] } },
    select: { code: true, name: true },
    orderBy: { code: "asc" },
  });
}

// Add one wallet for a user. Shared by the user's own action and the admin's assign action, so
// the cap is enforced once. Idempotent-ish: an existing wallet in that currency is not an error
// worth a crash, but it is reported rather than silently counted as a new one.
export async function addWalletFor(
  userId: string,
  rawCode: string,
): Promise<WalletMutationResult> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Choose a currency." };

  const currency = await prisma.currency.findFirst({
    where: { code, isActive: true },
    select: { code: true },
  });
  if (!currency) return { ok: false, error: "That currency isn't available." };

  // Duplicate before cap: a user at the cap asking for a currency they already hold should be
  // told it exists, not that they're out of slots — the cap isn't what's stopping them.
  if (await prisma.wallet.count({ where: { userId, currency: currency.code } })) {
    return { ok: false, error: `A ${currency.code} wallet already exists.` };
  }
  const existing = await prisma.wallet.count({ where: { userId } });
  if (existing >= MAX_WALLETS) {
    return { ok: false, error: `A user can hold at most ${MAX_WALLETS} wallets.` };
  }

  try {
    await prisma.wallet.create({
      data: {
        userId,
        currency: currency.code,
        // The primary is whichever wallet came first; an added wallet is never the default.
        isDefault: existing === 0,
      },
    });
    return { ok: true };
  } catch {
    // Unique race on (userId, currency) — the wallet the caller wanted now exists either way.
    return { ok: false, error: `A ${currency.code} wallet already exists.` };
  }
}

// Remove a wallet. The guards here are the important part: WalletTransaction cascades on wallet
// delete (prisma/schema.prisma), so removing a wallet that has history would silently destroy
// the user's ledger for that currency — and removing one holding a balance would destroy money.
// Both are refused; so is dropping the primary or the user's last wallet.
export async function removeWalletFor(
  userId: string,
  walletId: string,
): Promise<WalletMutationResult> {
  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
    select: { id: true, currency: true, balanceMinor: true, isDefault: true },
  });
  if (!wallet) return { ok: false, error: "Wallet not found." };

  if (wallet.isDefault) {
    return { ok: false, error: "The primary wallet can't be removed." };
  }
  const total = await prisma.wallet.count({ where: { userId } });
  if (total <= MIN_WALLETS) {
    return { ok: false, error: "A user must keep at least one wallet." };
  }
  if (wallet.balanceMinor !== 0n) {
    return {
      ok: false,
      error: `The ${wallet.currency} wallet still holds a balance. Empty it first.`,
    };
  }
  const history = await prisma.walletTransaction.count({ where: { walletId: wallet.id } });
  if (history > 0) {
    return {
      ok: false,
      error: `The ${wallet.currency} wallet has transaction history and can't be removed.`,
    };
  }

  await prisma.wallet.delete({ where: { id: wallet.id } });
  return { ok: true };
}
