import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import { loadUserWallets, MIN_WALLETS } from "@/lib/wallets";

// Read layer for the /wallet screen: one card per currency wallet, plus an optional converted
// total. Everything is formatted HERE, on the server — balances are BigInt minor units and must
// never cross the RSC boundary (design spec §5).
//
// This screen deliberately carries NO transaction history. It used to inline each wallet's last
// five ledger rows, which made it a second, worse /transactions: the same data, per wallet, with
// no filtering or paging, and one query per wallet to build it. The wallets are the subject here;
// history lives on /transactions, one link away.

export type WalletCardView = {
  id: string;
  currency: string;
  name: string; // "US Dollar" — falls back to the code when no Currency row exists
  balanceLabel: string;
  isDefault: boolean;
  // Why this wallet can't be removed, or null if it can. Mirrors removeWalletFor's guards in the
  // same order so the dialog can disable the button with the true reason rather than let the user
  // click and collect an error. The server remains the authority — this is presentation.
  removeBlockedReason: string | null;
};

// Present only when every wallet currency has an active rate to convert with — see below.
export type WalletTotalView = {
  currency: string;
  amountLabel: string;
};

export type WalletPageData = {
  wallets: WalletCardView[];
  total: WalletTotalView | null;
};

export async function getWalletPageData(userId: string): Promise<WalletPageData> {
  const wallets = await loadUserWallets(userId);
  if (wallets.length === 0) return { wallets: [], total: null };

  const codes = [...new Set(wallets.map((w) => w.currency))];
  const [currencies, txnCounts] = await Promise.all([
    prisma.currency.findMany({
      where: { code: { in: codes } },
      select: { code: true, name: true, rate: true, isActive: true },
    }),
    // One grouped count for every wallet at once — removal is blocked by ANY history, so the
    // count is all we need, and this replaces the per-wallet queries the activity lists required.
    prisma.walletTransaction.groupBy({
      by: ["walletId"],
      where: { walletId: { in: wallets.map((w) => w.id) } },
      _count: { _all: true },
    }),
  ]);

  const metaByCode = new Map(currencies.map((c) => [c.code, c]));
  const countByWallet = new Map(txnCounts.map((row) => [row.walletId, row._count._all]));

  const cards: WalletCardView[] = wallets.map((wallet) => ({
    id: wallet.id,
    currency: wallet.currency,
    name: metaByCode.get(wallet.currency)?.name ?? wallet.currency,
    balanceLabel: formatCurrency(toMajor(wallet.balanceMinor), wallet.currency),
    isDefault: wallet.isDefault,
    removeBlockedReason: removeBlockedReason({
      isDefault: wallet.isDefault,
      walletCount: wallets.length,
      balanceMinor: wallet.balanceMinor,
      history: countByWallet.get(wallet.id) ?? 0,
    }),
  }));

  return { wallets: cards, total: computeTotal(wallets, metaByCode) };
}

// Kept in lockstep with removeWalletFor (lib/wallets.ts). If the two ever disagree the button
// simply lies — the action still refuses — but the point is that it shouldn't have to.
function removeBlockedReason(w: {
  isDefault: boolean;
  walletCount: number;
  balanceMinor: bigint;
  history: number;
}): string | null {
  if (w.isDefault) return "Your primary wallet can't be removed. Make another one primary first.";
  if (w.walletCount <= MIN_WALLETS) return "You must keep at least one wallet.";
  if (w.balanceMinor !== 0n) return "This wallet still holds a balance. Empty it first.";
  if (w.history > 0) return "This wallet has transaction history and can't be removed.";
  return null;
}

type WalletRow = { currency: string; balanceMinor: bigint; isDefault: boolean };
type CurrencyMeta = { code: string; rate: unknown; isActive: boolean };

// Balances live in different currencies, so a total only exists if we can convert them all.
// Rate convention (matches lib/exchange.ts + app/(app)/exchange/actions.ts): Currency.rate is
// units of that currency per 1 unit of the base, so cross-rate(from→to) = rateTo / rateFrom.
// If ANY wallet currency lacks an active, positive rate we return null and the UI omits the
// total outright — a partial sum would silently under-report the user's money.
function computeTotal(
  wallets: WalletRow[],
  metaByCode: Map<string, CurrencyMeta>,
): WalletTotalView | null {
  const base = wallets.find((w) => w.isDefault) ?? wallets[0];
  const rateOf = (code: string): number | null => {
    const meta = metaByCode.get(code);
    if (!meta || !meta.isActive) return null;
    const rate = Number(meta.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  };

  const baseRate = rateOf(base.currency);
  if (baseRate === null) return null;

  let total = 0;
  for (const wallet of wallets) {
    const rate = rateOf(wallet.currency);
    if (rate === null) return null;
    total += toMajor(wallet.balanceMinor) * (baseRate / rate);
  }

  return { currency: base.currency, amountLabel: formatCurrency(total, base.currency) };
}
