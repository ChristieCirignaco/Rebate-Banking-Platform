import { prisma } from "@/lib/db";
import { isAdminTierRole } from "@/lib/auth-guards";
import { controlDefault, type ControlKind } from "@/lib/controls";
import { lookupIps } from "@/lib/ipinfo";
import { toMajor } from "@/lib/money/money";
import { MAX_WALLETS, MIN_WALLETS } from "@/lib/wallets";
import type {
  ActivityEntry,
  ControlKey,
  DetailTransaction,
  DetailTxnType,
  DetailWallet,
  ReferralUser,
  TransferCodes,
  TxnSummaryPoint,
  UserControl,
  UserDetail,
} from "@/components/admin/users/detail/types";

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  NGN: "Nigerian Naira",
  USDT: "Tether",
};

// `kind` decides how an absent key is read AND displayed (see lib/controls.ts): a capability is
// allowed until an admin turns it off, a requirement is off until an admin turns it on. Adding an
// entry here auto-wires the admin toggle — but a new key only does something once a guard reads it.
export const CONTROL_META: {
  key: ControlKey;
  label: string;
  description: string;
  kind: ControlKind;
}[] = [
  { key: "account_status", label: "Account Status", description: "Allows the user to sign in.", kind: "capability" },
  { key: "email_verification", label: "Email Verification", description: "Requires a verified email address before transactions.", kind: "requirement" },
  { key: "kyc_verification", label: "Kyc Verification", description: "Requires approved KYC before transactions.", kind: "requirement" },
  { key: "deposit", label: "Deposit", description: "Allows users to add funds to their wallet.", kind: "capability" },
  { key: "exchange_money", label: "Exchange Money", description: "Allows currency conversion within the wallet.", kind: "capability" },
  { key: "send_money", label: "Send Money", description: "Allows sending money to other users.", kind: "capability" },
  { key: "request_money", label: "Request Money", description: "Allows users to request money from others.", kind: "capability" },
  { key: "voucher", label: "Voucher", description: "Allows generating and redeeming vouchers.", kind: "capability" },
  { key: "withdraw", label: "Withdraw", description: "Allows withdrawal to linked bank accounts.", kind: "capability" },
];

function parseUserAgent(ua?: string | null): { browser: string; os: string } {
  const s = ua ?? "";
  const browser = /Edg/.test(s)
    ? "Edge"
    : /Chrome/.test(s)
      ? "Chrome"
      : /Firefox/.test(s)
        ? "Firefox"
        : /Safari/.test(s)
          ? "Safari"
          : "Unknown";
  const os = /Windows/.test(s)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(s)
      ? "macOS"
      : /Android/.test(s)
        ? "Android"
        : /iPhone|iPad|iOS/.test(s)
          ? "iOS"
          : /Linux/.test(s)
            ? "Linux"
            : "Unknown";
  return { browser, os };
}

function asControls(raw: unknown): Record<string, boolean> {
  return raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};
}

function asTransferCodes(raw: unknown): TransferCodes {
  const value = (raw ?? {}) as Partial<TransferCodes>;
  return { imf: value.imf ?? [], tax: value.tax ?? [], cot: value.cot ?? [] };
}

export type UserDetailData = {
  user: UserDetail;
  wallets: DetailWallet[];
  // Active currencies this user has no wallet in yet, plus how many more they may hold — feeds
  // the "Assign wallet" dialog so it can't offer a duplicate or exceed the cap.
  assignableCurrencies: { code: string; name: string }[];
  walletSlotsLeft: number;
  transactions: DetailTransaction[];
  referrals: ReferralUser[];
  activity: ActivityEntry[];
  controls: UserControl[];
  transferCodes: TransferCodes;
  statValues: Record<string, number>;
  statCurrency: string;
  txnSummary: TxnSummaryPoint[];
};

export async function getUserDetailData(id: string): Promise<UserDetailData | null> {
  const dbUser = await prisma.user.findUnique({
    where: { id },
    include: {
      wallets: { orderBy: [{ isDefault: "desc" }, { currency: "asc" }] },
      transactions: { orderBy: { createdAt: "desc" }, take: 100 },
      referrals: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      sessions: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  // Admin-tier accounts are managed exclusively at /admin/users/admin (which enforces
  // the super_admin-only edit/deactivate gate and the super_admin sensitive-field lock);
  // treating one as "not found" here closes off the unrestricted single-user action set
  // (manage funds, notify, withdrawal control, etc.) from ever reaching an admin account.
  if (!dbUser || isAdminTierRole(dbUser.role)) return null;

  const [firstName, ...rest] = dbUser.name.split(" ");
  const latestSession = dbUser.sessions[0];

  const user: UserDetail = {
    id: dbUser.id,
    firstName,
    lastName: rest.join(" "),
    name: dbUser.name,
    username: dbUser.username ?? dbUser.email.split("@")[0],
    email: dbUser.email,
    emailVerified: dbUser.emailVerified,
    phone: dbUser.phone ?? "",
    gender: (dbUser.gender as UserDetail["gender"]) ?? "unspecified",
    birthday: dbUser.birthday ? dbUser.birthday.toISOString().slice(0, 10) : "",
    country: dbUser.country ?? "",
    address: dbUser.address ?? "",
    avatarUrl: dbUser.image ?? undefined,
    lastLogin: dbUser.lastLoginAt?.toISOString(),
    browser: latestSession ? Object.values(parseUserAgent(latestSession.userAgent)).join(" on ") : "Unknown",
    withdrawalStatus: (dbUser.withdrawalStatus as UserDetail["withdrawalStatus"]) ?? "allowed",
    withdrawalMessage: dbUser.withdrawalMessage ?? "",
  };

  // Which wallets carry ledger history — one grouped count rather than a query per wallet.
  // History matters because WalletTransaction cascades on wallet delete: removing a wallet that
  // has any would silently wipe that currency's ledger for the user.
  const historyRows = await prisma.walletTransaction.groupBy({
    by: ["walletId"],
    where: { userId: dbUser.id },
    _count: { _all: true },
  });
  const withHistory = new Set(historyRows.map((row) => row.walletId));

  const wallets: DetailWallet[] = dbUser.wallets.map((wallet) => {
    const blocked = wallet.isDefault
      ? "The primary wallet can't be removed."
      : dbUser.wallets.length <= MIN_WALLETS
        ? "A user must keep at least one wallet."
        : wallet.balanceMinor !== 0n
          ? "This wallet still holds a balance."
          : withHistory.has(wallet.id)
            ? "This wallet has transaction history."
            : null;
    return {
      id: wallet.id,
      currency: wallet.currency,
      name: CURRENCY_NAMES[wallet.currency] ?? wallet.currency,
      balance: toMajor(wallet.balanceMinor),
      isDefault: wallet.isDefault,
      removable: blocked === null,
      removeBlockedReason: blocked,
    };
  });

  const heldCodes = wallets.map((wallet) => wallet.currency);
  const assignableCurrencies = (
    await prisma.currency.findMany({
      where: { isActive: true, code: { notIn: heldCodes.length ? heldCodes : ["__none__"] } },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    })
  ).map((currency) => ({ code: currency.code, name: currency.name }));

  const transactions: DetailTransaction[] = dbUser.transactions.map((tx) => ({
    id: `TRX-${tx.id.slice(0, 8).toUpperCase()}`,
    description: tx.description ?? tx.source,
    provider: tx.provider ?? "System",
    amount: (tx.direction === "credit" ? 1 : -1) * toMajor(tx.amountMinor),
    currency: tx.currency,
    type: tx.source as DetailTxnType,
    status: (tx.status === "failed" ? "failed" : tx.status === "pending" ? "pending" : "completed") as DetailTransaction["status"],
    createdAt: tx.createdAt.toISOString(),
  }));

  const referrals: ReferralUser[] = dbUser.referrals.map((ref) => ({
    id: ref.id,
    name: ref.name,
    email: ref.email,
    avatarUrl: ref.image ?? undefined,
    joinedAt: ref.createdAt.toISOString(),
  }));

  const activity: ActivityEntry[] = dbUser.sessions.map((session) => {
    const { browser, os } = parseUserAgent(session.userAgent);
    return {
      id: session.id,
      loginAt: session.createdAt.toISOString(),
      ip: session.ipAddress ?? "—",
      country: user.country || "Unknown",
      browser,
      os,
    };
  });

  // Enrich each login's IP with real geolocation via IPinfo when the plugin is enabled;
  // otherwise the entries keep the raw IP + profile country set above (the fallback).
  const ipInfo = await lookupIps(activity.map((entry) => entry.ip));
  if (ipInfo) {
    for (const entry of activity) {
      const info = ipInfo.get(entry.ip);
      if (!info) continue;
      const location = [info.city, info.region, info.country].filter(Boolean).join(", ");
      if (location) entry.country = location;
      if (info.org) entry.org = info.org;
    }
  }

  // An unset key must display the default the guards actually apply, not a blanket off — a
  // capability nobody has touched IS allowed, so showing it off told the admin the opposite of
  // the truth for every user with an empty controls map.
  const controlState = asControls(dbUser.controls);
  const controls: UserControl[] = CONTROL_META.map((meta) => ({
    ...meta,
    enabled: controlState[meta.key] ?? controlDefault(meta.kind),
  }));

  // Money stats are reported in one currency (mixing minor units across currencies is
  // meaningless without FX), so they scope to the user's primary/default wallet currency.
  const primaryCurrency =
    dbUser.wallets.find((w) => w.isDefault)?.currency ??
    dbUser.currency ??
    dbUser.wallets[0]?.currency ??
    "USD";

  // Aggregate over the whole ledger, not the 100 rows fetched for the table, so the
  // totals are true lifetime figures.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 29);

  const [statusGroups, sourceGroups, recentTxns] = await Promise.all([
    prisma.walletTransaction.groupBy({
      by: ["status"],
      where: { userId: id },
      _count: { _all: true },
    }),
    prisma.walletTransaction.groupBy({
      by: ["source", "direction"],
      where: { userId: id, currency: primaryCurrency },
      _sum: { amountMinor: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: id, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
  ]);

  const statusCount = (status: string) =>
    statusGroups.find((group) => group.status === status)?._count._all ?? 0;
  const sourceSum = (source: string, direction?: string) =>
    toMajor(
      sourceGroups
        .filter((group) => group.source === source && (!direction || group.direction === direction))
        .reduce((total, group) => total + (group._sum.amountMinor ?? 0n), 0n),
    );

  const statValues: Record<string, number> = {
    "Total Trx": statusGroups.reduce((total, group) => total + group._count._all, 0),
    "Completed Trx": statusCount("completed"),
    "Pending Trx": statusCount("pending"),
    "Failed Trx": statusCount("failed"),
    Deposit: sourceSum("deposit", "credit"),
    Withdraw: sourceSum("withdrawal"),
    "Exchange Money": sourceSum("exchange"),
    Reward: sourceSum("reward"),
    "Total Wallets": dbUser.wallets.length,
    "Total Balance": toMajor(
      dbUser.wallets
        .filter((w) => w.currency === primaryCurrency)
        .reduce((total, w) => total + w.balanceMinor, 0n),
    ),
    "Referrals Made": dbUser.referrals.length,
  };

  // Daily completed/pending/failed counts over the last 30 days.
  const summaryMap = new Map<string, { completed: number; pending: number; failed: number }>();
  for (const tx of recentTxns) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    const bucket = summaryMap.get(key) ?? { completed: 0, pending: 0, failed: 0 };
    if (tx.status === "pending") bucket.pending += 1;
    else if (tx.status === "failed") bucket.failed += 1;
    else bucket.completed += 1;
    summaryMap.set(key, bucket);
  }
  const txnSummary: TxnSummaryPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 30; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    txnSummary.push({ date: key, ...(summaryMap.get(key) ?? { completed: 0, pending: 0, failed: 0 }) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    user,
    wallets,
    assignableCurrencies,
    walletSlotsLeft: Math.max(0, MAX_WALLETS - wallets.length),
    transactions,
    referrals,
    activity,
    controls,
    transferCodes: asTransferCodes(dbUser.transferCodes),
    statValues,
    statCurrency: primaryCurrency,
    txnSummary,
  };
}
