import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatRateLabel, toMajor } from "@/lib/money/money";
import { loadUserWallets } from "@/lib/wallets";

// User-facing Exchange Money reads: the caller's wallets joined to the admin-configured Currency
// rows (rate + symbol) so the client can compute conversions, plus recent exchange history. Only
// wallets whose currency is an active Currency with a positive rate can be exchanged.

export type ExchangeWalletView = {
  id: string;
  currency: string;
  symbol: string;
  label: string; // "USD Wallet"
  balance: number; // major units (for client-side validation)
  balanceLabel: string;
  rate: number; // Currency.rate — units of this currency per 1 unit of the base currency
};

export type ExchangeHistoryRow = {
  id: string;
  txnId: string;
  fromLabel: string;
  toLabel: string;
  rateLabel: string; // "1 USD = 0.96 EUR"
  createdAtLabel: string;
};

export type ExchangeData = {
  wallets: ExchangeWalletView[];
  history: ExchangeHistoryRow[];
  hasPin: boolean;
};

export async function getExchangeData(userId: string): Promise<ExchangeData> {
  const [wallets, user, exchanges] = await Promise.all([
    loadUserWallets(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } }),
    prisma.exchange.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const codes = [...new Set(wallets.map((w) => w.currency))];
  const currencies = codes.length
    ? await prisma.currency.findMany({
        where: { code: { in: codes }, isActive: true },
        select: { code: true, symbol: true, rate: true },
      })
    : [];
  const byCode = new Map(currencies.map((c) => [c.code, { symbol: c.symbol, rate: Number(c.rate) }]));

  const walletViews: ExchangeWalletView[] = [];
  for (const w of wallets) {
    const meta = byCode.get(w.currency);
    if (!meta || meta.rate <= 0) continue; // no active rate → not exchangeable
    walletViews.push({
      id: w.id,
      currency: w.currency,
      symbol: meta.symbol,
      label: `${w.currency} Wallet`,
      balance: toMajor(w.balanceMinor),
      balanceLabel: formatCurrency(toMajor(w.balanceMinor), w.currency),
      rate: meta.rate,
    });
  }

  return {
    wallets: walletViews,
    hasPin: Boolean(user?.transactionPin),
    history: exchanges.map((e) => ({
      id: e.id,
      txnId: e.txnId,
      fromLabel: formatCurrency(toMajor(e.fromAmountMinor), e.fromCurrency),
      toLabel: formatCurrency(toMajor(e.toAmountMinor), e.toCurrency),
      rateLabel: formatRateLabel(e.fromCurrency, Number(e.rate), e.toCurrency),
      createdAtLabel: formatDateTime(e.createdAt.toISOString()),
    })),
  };
}
