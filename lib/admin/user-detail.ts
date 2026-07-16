import { prisma } from "@/lib/db";
import { isAdminTierRole } from "@/lib/auth-guards";
import { lookupIps } from "@/lib/ipinfo";
import { toMajor } from "@/lib/money/money";
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

export const CONTROL_META: { key: ControlKey; label: string; description: string }[] = [
  { key: "account_status", label: "Account Status", description: "Controls user login access." },
  { key: "email_verification", label: "Email Verification", description: "Requires email verification to activate the account." },
  { key: "kyc_verification", label: "Kyc Verification", description: "Requires KYC verification before transactions." },
  { key: "deposit", label: "Deposit", description: "Allows users to add funds to their wallet." },
  { key: "exchange_money", label: "Exchange Money", description: "Allows currency conversion within the wallet." },
  { key: "send_money", label: "Send Money", description: "Allows sending money to other users." },
  { key: "request_money", label: "Request Money", description: "Allows users to request money from others." },
  { key: "voucher", label: "Voucher", description: "Allows generating and redeeming vouchers." },
  { key: "withdraw", label: "Withdraw", description: "Allows withdrawal to linked bank accounts." },
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

  const wallets: DetailWallet[] = dbUser.wallets.map((wallet) => ({
    currency: wallet.currency,
    name: CURRENCY_NAMES[wallet.currency] ?? wallet.currency,
    balance: toMajor(wallet.balanceMinor),
    isDefault: wallet.isDefault,
  }));

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

  const controlState = asControls(dbUser.controls);
  const controls: UserControl[] = CONTROL_META.map((meta) => ({
    ...meta,
    enabled: controlState[meta.key] ?? false,
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
