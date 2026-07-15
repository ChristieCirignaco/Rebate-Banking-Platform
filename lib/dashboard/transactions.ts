import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";

// Presentation helpers for the user dashboard. These run on the SERVER (in the page
// components) and produce plain, serializable view objects — never BigInt, never a React
// element — so the result can be handed straight to the client filter/list components
// without tripping the RSC serialization boundary.

// The ledger `source` values we know how to render (schema: WalletTransaction.source).
export type TxnSource =
  | "deposit"
  | "withdrawal"
  | "withdrawal_reversal"
  | "adjustment"
  | "fee"
  | "transfer"
  | "rebate"
  | "reward";

// A stable key the row component maps to a lucide icon. Kept as a string (not the icon
// itself) so the view object stays serializable across the server→client boundary.
export type TxnIconKey =
  | "deposit"
  | "withdrawal"
  | "reversal"
  | "adjustment"
  | "fee"
  | "transfer"
  | "rebate"
  | "reward";

// The filter chips on the Transaction History screen. Adapted from the mockup to this
// app's ledger (the mockup's "Request" has no analog here).
export type TxnFilter = "all" | "income" | "sent" | "transfer" | "rebate";

export type TransactionView = {
  id: string;
  iconKey: TxnIconKey;
  title: string;
  subtitle: string;
  amountLabel: string; // e.g. "+$480.00" / "-$12.99" (sign + currency)
  positive: boolean; // credit → shown green with a leading "+"
  pending: boolean; // ledger status !== "completed"
  createdAtISO: string;
  timeLabel: string; // pre-formatted "Nov 4, 10:42 AM" (server-side → no hydration drift)
  groupLabel: string; // "Today" / "Yesterday" / "Nov 2, 2026" — computed server-side too
  // Which chips this row belongs to. A transfer is also income/sent by direction, so a row
  // can match more than one filter — chips are views over the ledger, not exclusive buckets.
  filters: TxnFilter[];
};

const ICON_BY_SOURCE: Record<TxnSource, TxnIconKey> = {
  deposit: "deposit",
  withdrawal: "withdrawal",
  withdrawal_reversal: "reversal",
  adjustment: "adjustment",
  fee: "fee",
  transfer: "transfer",
  rebate: "rebate",
  reward: "reward",
};

const LABEL_BY_SOURCE: Record<TxnSource, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  withdrawal_reversal: "Withdrawal reversed",
  adjustment: "Adjustment",
  fee: "Fee",
  transfer: "Transfer",
  rebate: "Rebate",
  reward: "Reward",
};

function isKnownSource(source: string): source is TxnSource {
  return source in ICON_BY_SOURCE;
}

// The minimal shape of a ledger row this module needs. Matches Prisma's WalletTransaction
// but declared loosely so callers can pass a `select`-ed subset.
type LedgerRow = {
  id: string;
  direction: string; // "credit" | "debit"
  amountMinor: bigint;
  currency: string;
  source: string;
  status: string;
  description: string | null;
  memo: string | null;
  provider: string | null;
  createdAt: Date;
};

function filtersFor(source: TxnSource | null, positive: boolean): TxnFilter[] {
  const filters: TxnFilter[] = ["all"];
  filters.push(positive ? "income" : "sent");
  if (source === "transfer") filters.push("transfer");
  if (source === "rebate" || source === "reward") filters.push("rebate");
  return filters;
}

// Turn a raw ledger row into a serializable view object for the row component. `now` drives
// the "Today"/"Yesterday" group label, computed here (server-side) so the client never does
// date math — grouping the filtered list on the client is then a pure string walk.
export function presentTransaction(txn: LedgerRow, now: Date = new Date()): TransactionView {
  const source = isKnownSource(txn.source) ? txn.source : null;
  const positive = txn.direction === "credit";
  const label = source ? LABEL_BY_SOURCE[source] : "Transaction";
  const magnitude = toMajor(txn.amountMinor < 0n ? -txn.amountMinor : txn.amountMinor);

  // Prefer a human description as the headline; fall back to the humanized source. The
  // subtitle then carries the secondary detail (source name, provider, or direction).
  const description = txn.description?.trim() || null;
  const secondary =
    txn.memo?.trim() ||
    (description ? label : txn.provider?.trim() || (positive ? "Received" : "Paid"));

  return {
    id: txn.id,
    iconKey: source ? ICON_BY_SOURCE[source] : "adjustment",
    title: description ?? label,
    subtitle: secondary,
    amountLabel: `${positive ? "+" : "-"}${formatCurrency(magnitude, txn.currency)}`,
    positive,
    pending: txn.status !== "completed",
    createdAtISO: txn.createdAt.toISOString(),
    timeLabel: formatTxnTime(txn.createdAt),
    groupLabel: dayLabel(txn.createdAt, now),
    filters: filtersFor(source, positive),
  };
}

// Deterministic short timestamp for a row, e.g. "Nov 4, 10:42 AM". Pinned to UTC so the
// value is identical on the server and after client hydration (no timezone-dependent
// mismatch). User-timezone localization is a later refinement.
function formatTxnTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Day grouping — "Today" / "Yesterday" / "Mon D, YYYY", newest group first.
// ---------------------------------------------------------------------------

export type TransactionGroup = { label: string; items: TransactionView[] };

// Local calendar-day key (YYYY-MM-DD, UTC). Both the day bucket and the "Today"/"Yesterday"
// test use the same UTC basis so they can never disagree — and it matches the UTC timeLabel.
function dayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date, now: Date): string {
  const key = dayKey(d);
  if (key === dayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  if (key === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Group already-presented rows by their server-computed `groupLabel`. A pure walk over
// consecutive rows (no date math), so it is safe to call on the client after filtering.
// Assumes `items` is sorted newest-first; preserves that order within and across groups.
export function groupByLabel(items: TransactionView[]): TransactionGroup[] {
  const groups: TransactionGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || last.label !== item.groupLabel) {
      groups.push({ label: item.groupLabel, items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Balance hero — greeting + 30-day change.
// ---------------------------------------------------------------------------

export function greetingForDate(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export type BalanceDelta = {
  label: string; // signed money, e.g. "+$3,456.00"
  percentLabel: string; // e.g. "8.98%"
  positive: boolean;
};

// Net change over the last 30 days for one wallet, plus the percentage against the
// balance 30 days ago (currentBalance − net). Used for the green/red delta under the hero.
export function computeBalanceDelta(
  rows: Array<Pick<LedgerRow, "direction" | "amountMinor" | "createdAt">>,
  currentBalanceMinor: bigint,
  currency: string,
  now: Date = new Date(),
): BalanceDelta | null {
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 30);

  let netMinor = 0n;
  for (const row of rows) {
    if (row.createdAt < cutoff) continue;
    const mag = row.amountMinor < 0n ? -row.amountMinor : row.amountMinor;
    netMinor += row.direction === "credit" ? mag : -mag;
  }
  if (netMinor === 0n) return null;

  const positive = netMinor > 0n;
  const netMajor = toMajor(netMinor < 0n ? -netMinor : netMinor);
  const baselineMinor = currentBalanceMinor - netMinor; // balance ~30 days ago
  const baseline = toMajor(baselineMinor < 0n ? -baselineMinor : baselineMinor);
  const percent = baseline > 0 ? (netMajor / baseline) * 100 : 100;

  return {
    label: `${positive ? "+" : "-"}${formatCurrency(netMajor, currency)}`,
    percentLabel: `${percent.toFixed(2)}%`,
    positive,
  };
}
