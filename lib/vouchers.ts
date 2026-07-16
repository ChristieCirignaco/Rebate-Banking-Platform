import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor } from "@/lib/money/money";

// User-facing Voucher reads: the caller's wallets with their per-currency voucher fee + rate
// (from the admin "voucher" CurrencyRole and Currency.rate) so the Generate modal can compute
// the live summary, plus the vouchers the user has created for the "My Vouchers" table.

export type VoucherStatus = "pending" | "redeemed" | "expired" | "canceled";

export type VoucherWalletView = {
  id: string;
  currency: string;
  symbol: string;
  label: string; // "USD Wallet"
  balance: number; // major units (client-side validation)
  balanceLabel: string;
  rate: number; // Currency.rate — units of this currency per 1 base unit
  feeType: "percent" | "fixed";
  feeValue: number; // percent (e.g. 2 = 2%) or a fixed amount in major units
  minAmount: number; // 0 = no minimum
  maxAmount: number; // 0 = no maximum
};

export type VoucherRow = {
  id: string;
  code: string;
  amountLabel: string;
  currency: string;
  status: VoucherStatus;
  redeemedByName: string | null;
  redeemedOnLabel: string | null;
  createdOnLabel: string;
};

export type VoucherData = {
  wallets: VoucherWalletView[];
  vouchers: VoucherRow[];
  baseCode: string; // the default currency's code, for the "Conversion Rate" line
};

// A stored-pending voucher past its expiry reads as "expired" (redemption also enforces this).
function effectiveStatus(status: string, expiresAt: Date | null): VoucherStatus {
  if (status === "pending" && expiresAt && expiresAt.getTime() < Date.now()) return "expired";
  return status as VoucherStatus;
}

export async function getVoucherData(userId: string): Promise<VoucherData> {
  const [wallets, vouchers, base] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
    }),
    prisma.voucher.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.currency.findFirst({ where: { isDefault: true }, select: { code: true } }),
  ]);

  const codes = [...new Set(wallets.map((w) => w.currency))];
  const currencies = codes.length
    ? await prisma.currency.findMany({
        where: { code: { in: codes }, isActive: true },
        select: {
          code: true,
          symbol: true,
          rate: true,
          roles: {
            where: { role: "voucher" },
            select: { feeType: true, feeValue: true, minAmount: true, maxAmount: true, enabled: true },
          },
        },
      })
    : [];
  const byCode = new Map(
    currencies.map((c) => {
      const vr = c.roles[0];
      const active = vr && vr.enabled !== false;
      return [
        c.code,
        {
          symbol: c.symbol,
          rate: Number(c.rate),
          feeType: (vr?.feeType === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
          feeValue: active ? Number(vr.feeValue) : 0,
          minAmount: active ? Number(vr.minAmount) : 0,
          maxAmount: active ? Number(vr.maxAmount) : 0,
        },
      ];
    }),
  );

  const walletViews: VoucherWalletView[] = [];
  for (const w of wallets) {
    const meta = byCode.get(w.currency);
    if (!meta) continue; // currency not active → not voucher-eligible
    walletViews.push({
      id: w.id,
      currency: w.currency,
      symbol: meta.symbol,
      label: `${w.currency} Wallet`,
      balance: toMajor(w.balanceMinor),
      balanceLabel: formatCurrency(toMajor(w.balanceMinor), w.currency),
      rate: meta.rate,
      feeType: meta.feeType,
      feeValue: meta.feeValue,
      minAmount: meta.minAmount,
      maxAmount: meta.maxAmount,
    });
  }

  return {
    wallets: walletViews,
    baseCode: base?.code ?? "USD",
    vouchers: vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      amountLabel: formatCurrency(toMajor(v.amountMinor), v.currency),
      currency: v.currency,
      status: effectiveStatus(v.status, v.expiresAt),
      redeemedByName: v.redeemedByName,
      redeemedOnLabel: v.redeemedAt ? formatDateTime(v.redeemedAt.toISOString()) : null,
      createdOnLabel: formatDateTime(v.createdAt.toISOString()),
    })),
  };
}
