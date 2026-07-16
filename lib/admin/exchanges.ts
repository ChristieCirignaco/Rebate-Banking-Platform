import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatRateLabel, toMajor } from "@/lib/money/money";
import type { AdminExchangeRow } from "@/components/admin/exchanges/types";

// Admin read layer for Exchange history. Exchanges settle instantly (no review), so this is a
// read-only record; the money legs also appear in /admin/transaction as "exchange" ledger rows.
export async function getAdminExchanges(): Promise<AdminExchangeRow[]> {
  const rows = await prisma.exchange.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((e) => ({
    id: e.id,
    txnId: e.txnId,
    userName: e.user.name,
    userEmail: e.user.email,
    fromLabel: formatCurrency(toMajor(e.fromAmountMinor), e.fromCurrency),
    toLabel: formatCurrency(toMajor(e.toAmountMinor), e.toCurrency),
    rateLabel: formatRateLabel(e.fromCurrency, Number(e.rate), e.toCurrency),
    createdAtLabel: formatDateTime(e.createdAt.toISOString()),
  }));
}
