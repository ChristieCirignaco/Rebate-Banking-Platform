import { prisma } from "@/lib/db";
import { LABEL_BY_SOURCE, type TxnSource } from "@/lib/dashboard/transactions";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import { loadUserWallets } from "@/lib/wallets";

// Read layer for the /statistic screen: the user's own ledger bucketed into a daily money-in /
// money-out series and a per-source breakdown, for each selectable range.
//
// Series are scoped to ONE currency at a time (the page offers a currency picker). Balances and
// amounts in different currencies are not commensurable — summing USD and NGN into one bar
// would be a lie — so each wallet currency gets its own independent set of buckets.
//
// Amounts are accumulated as BigInt minor units and converted ONCE at the end: the numbers that
// cross the RSC boundary are plain major-unit floats (recharts needs numbers) plus preformatted
// currency labels. No BigInt ever leaves this module (design spec §5).

export const STAT_RANGES = [30, 90] as const;
export type StatRange = (typeof STAT_RANGES)[number];
type StatRangeKey = `${StatRange}`;

export type StatDayPoint = {
  date: string; // YYYY-MM-DD (UTC)
  label: string; // "Jul 16"
  moneyIn: number; // major units
  moneyOut: number; // major units, positive magnitude
};

export type StatSourceSlice = {
  source: string; // the raw ledger `source` value
  label: string;
  amount: number; // major units, absolute (credits and debits both count as volume)
  amountLabel: string;
  count: number;
};

export type StatRangeView = {
  days: StatDayPoint[]; // every day in the range, zero-filled — a continuous axis
  sources: StatSourceSlice[]; // largest volume first
  count: number; // ledger rows in the range; 0 → the UI shows its empty state
  inLabel: string;
  outLabel: string;
  netLabel: string; // signed, e.g. "+$1,204.00"
  netPositive: boolean;
};

export type StatCurrencyView = {
  currency: string;
  name: string;
  isDefault: boolean;
  ranges: Record<StatRangeKey, StatRangeView>;
};

export type StatisticData = {
  currencies: StatCurrencyView[]; // default wallet first (loadUserWallets order)
};

// `transfer_reversal` is posted by the transfer flow (see the reversal path) but is missing from
// LABEL_BY_SOURCE in lib/dashboard/transactions.ts, so cover it here. Anything else unknown gets
// humanized rather than dropped — the breakdown must account for every row it counted.
const EXTRA_LABEL_BY_SOURCE: Record<string, string> = {
  transfer_reversal: "Transfer reversed",
};

function labelForSource(source: string): string {
  if (source in LABEL_BY_SOURCE) return LABEL_BY_SOURCE[source as TxnSource];
  if (source in EXTRA_LABEL_BY_SOURCE) return EXTRA_LABEL_BY_SOURCE[source];
  const spaced = source.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// UTC calendar-day key. Matches the basis lib/dashboard/transactions.ts groups on, so a row
// never lands in a different day here than it shows under on the History screen.
function dayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// First instant of the earliest day included in `range` (inclusive of today).
function rangeStart(range: number, now: Date): Date {
  const start = startOfUtcDay(now);
  start.setUTCDate(start.getUTCDate() - (range - 1));
  return start;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

type StatRow = {
  currency: string;
  direction: string;
  amountMinor: bigint;
  source: string;
  createdAt: Date;
};

export async function getStatisticData(userId: string): Promise<StatisticData> {
  const wallets = await loadUserWallets(userId);
  if (wallets.length === 0) return { currencies: [] };

  const now = new Date();
  const maxRange = Math.max(...STAT_RANGES);
  const codes = [...new Set(wallets.map((w) => w.currency))];

  // Fetch the widest range once and derive every narrower range in memory — one query instead
  // of ranges × currencies round-trips.
  const [rows, currencies] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId, currency: { in: codes }, createdAt: { gte: rangeStart(maxRange, now) } },
      select: {
        currency: true,
        direction: true,
        amountMinor: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.currency.findMany({ where: { code: { in: codes } }, select: { code: true, name: true } }),
  ]);

  const nameByCode = new Map(currencies.map((c) => [c.code, c.name]));
  const rowsByCurrency = new Map<string, StatRow[]>();
  for (const row of rows) {
    const bucket = rowsByCurrency.get(row.currency);
    if (bucket) bucket.push(row);
    else rowsByCurrency.set(row.currency, [row]);
  }

  return {
    currencies: wallets.map((wallet) => {
      const walletRows = rowsByCurrency.get(wallet.currency) ?? [];
      return {
        currency: wallet.currency,
        name: nameByCode.get(wallet.currency) ?? wallet.currency,
        isDefault: wallet.isDefault,
        ranges: {
          "30": buildRange(walletRows, 30, now, wallet.currency),
          "90": buildRange(walletRows, 90, now, wallet.currency),
        },
      };
    }),
  };
}

function buildRange(
  rows: StatRow[],
  range: StatRange,
  now: Date,
  currency: string,
): StatRangeView {
  const start = rangeStart(range, now);

  // Seed every day in the window so gaps render as zero rather than collapsing the x-axis.
  const dates: Date[] = [];
  const buckets = new Map<string, { inMinor: bigint; outMinor: bigint }>();
  for (let i = 0; i < range; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    dates.push(date);
    buckets.set(dayKey(date), { inMinor: 0n, outMinor: 0n });
  }

  const bySource = new Map<string, { amountMinor: bigint; count: number }>();
  let inMinor = 0n;
  let outMinor = 0n;
  let count = 0;

  for (const row of rows) {
    const bucket = buckets.get(dayKey(row.createdAt));
    if (!bucket) continue; // outside this (narrower) range
    const magnitude = row.amountMinor < 0n ? -row.amountMinor : row.amountMinor;
    count++;

    if (row.direction === "credit") {
      bucket.inMinor += magnitude;
      inMinor += magnitude;
    } else {
      bucket.outMinor += magnitude;
      outMinor += magnitude;
    }

    const slice = bySource.get(row.source) ?? { amountMinor: 0n, count: 0 };
    slice.amountMinor += magnitude;
    slice.count++;
    bySource.set(row.source, slice);
  }

  const days: StatDayPoint[] = dates.map((date) => {
    const bucket = buckets.get(dayKey(date))!;
    return {
      date: dayKey(date),
      label: dayLabel(date),
      moneyIn: toMajor(bucket.inMinor),
      moneyOut: toMajor(bucket.outMinor),
    };
  });

  const sources: StatSourceSlice[] = [...bySource.entries()]
    .map(([source, slice]) => ({
      source,
      label: labelForSource(source),
      amount: toMajor(slice.amountMinor),
      amountLabel: formatCurrency(toMajor(slice.amountMinor), currency),
      count: slice.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const netMinor = inMinor - outMinor;
  const netMagnitude = netMinor < 0n ? -netMinor : netMinor;

  return {
    days,
    sources,
    count,
    inLabel: formatCurrency(toMajor(inMinor), currency),
    outLabel: formatCurrency(toMajor(outMinor), currency),
    netLabel: `${netMinor < 0n ? "-" : "+"}${formatCurrency(toMajor(netMagnitude), currency)}`,
    netPositive: netMinor >= 0n,
  };
}
