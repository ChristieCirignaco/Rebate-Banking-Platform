import { prisma } from "@/lib/db";
import { presentTransaction, type TxnIconKey } from "@/lib/dashboard/transactions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import { loadUserWallets } from "@/lib/wallets";

// Read layer for the /wallet screen: one card per currency wallet (balance + a short tail of
// that wallet's ledger), plus an optional converted total. Everything is formatted HERE, on the
// server — balances are BigInt minor units and must never cross the RSC boundary (design spec §5).

const ACTIVITY_COUNT = 5;

export type WalletActivityView = {
  id: string;
  iconKey: TxnIconKey;
  title: string;
  amountLabel: string; // signed + currency, e.g. "+$480.00"
  positive: boolean;
  pending: boolean;
  dateLabel: string;
};

export type WalletCardView = {
  id: string;
  currency: string;
  name: string; // "US Dollar" — falls back to the code when no Currency row exists
  balanceLabel: string;
  isDefault: boolean;
  activity: WalletActivityView[];
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
  const [currencies, activityPerWallet] = await Promise.all([
    prisma.currency.findMany({
      where: { code: { in: codes } },
      select: { code: true, name: true, rate: true, isActive: true },
    }),
    // One small query per wallet (a user holds a handful) so each card gets exactly its own
    // last N rows — a single take() across the user would starve the quieter wallets.
    Promise.all(
      wallets.map((wallet) =>
        prisma.walletTransaction.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: "desc" },
          take: ACTIVITY_COUNT,
          select: {
            id: true,
            direction: true,
            amountMinor: true,
            currency: true,
            source: true,
            status: true,
            description: true,
            memo: true,
            provider: true,
            createdAt: true,
          },
        }),
      ),
    ),
  ]);

  const metaByCode = new Map(currencies.map((c) => [c.code, c]));
  const now = new Date();

  const cards: WalletCardView[] = wallets.map((wallet, i) => ({
    id: wallet.id,
    currency: wallet.currency,
    name: metaByCode.get(wallet.currency)?.name ?? wallet.currency,
    balanceLabel: formatCurrency(toMajor(wallet.balanceMinor), wallet.currency),
    isDefault: wallet.isDefault,
    activity: activityPerWallet[i].map((txn) => {
      // Reuse the canonical presenter for the icon/title/signed amount, then add the absolute
      // date this screen shows instead of the dashboard's relative time.
      const view = presentTransaction(txn, now);
      return {
        id: view.id,
        iconKey: view.iconKey,
        title: view.title,
        amountLabel: view.amountLabel,
        positive: view.positive,
        pending: view.pending,
        dateLabel: formatDateTime(view.createdAtISO),
      };
    }),
  }));

  return { wallets: cards, total: computeTotal(wallets, metaByCode) };
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
