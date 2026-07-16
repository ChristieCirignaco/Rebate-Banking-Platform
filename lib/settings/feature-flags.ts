import { cache } from "react";

import { prisma } from "@/lib/db";

// Compile-time allowlist of togglable features (spec §8: DB-backed flags from a known-key
// allowlist, fail-closed). `side` groups them in the UI; `defaultEnabled` is the fallback
// when no row exists yet.
//
// A flag that gates a user PAGE does two things: it hides the nav entry (components/app/app-nav
// maps each entry to its key) and it redirects the route to /dashboard. Both matter — hiding
// alone is decoration, since the URL is still typeable.
//
// Dashboard is deliberately NOT gateable: every other guard redirects to /dashboard, so a flag
// that could turn it off would trap the user in a redirect loop. It's the floor of the app.
export const FEATURE_FLAGS = [
  { key: "deposits", label: "Deposits", description: "Allow users to fund their wallet.", side: "user", defaultEnabled: true },
  { key: "withdrawals", label: "Withdrawals", description: "Allow users to withdraw funds.", side: "user", defaultEnabled: true },
  { key: "registration", label: "Registration", description: "Allow new users to sign up.", side: "user", defaultEnabled: true },
  { key: "products", label: "Products", description: "Show the Products page and rebate history.", side: "user", defaultEnabled: true },
  { key: "product_submission", label: "Product / Rebate Submission", description: "Allow users to submit products for rebate review.", side: "user", defaultEnabled: true },
  { key: "kyc_submission", label: "KYC Submission", description: "Allow users to submit identity verification.", side: "user", defaultEnabled: true },
  { key: "exchange", label: "Currency Exchange", description: "Allow in-wallet currency conversion.", side: "user", defaultEnabled: true },
  { key: "send_money", label: "Send Money", description: "Allow user-to-user transfers.", side: "user", defaultEnabled: true },
  { key: "transfer_internal", label: "— Internal transfers", description: "Allow the Internal transfer type (user to user). Requires Send Money.", side: "user", defaultEnabled: true },
  { key: "transfer_domestic", label: "— Domestic transfers", description: "Allow the Domestic transfer type (local bank). Requires Send Money.", side: "user", defaultEnabled: true },
  { key: "transfer_wire", label: "— Wire transfers", description: "Allow the Wire transfer type (international). Requires Send Money.", side: "user", defaultEnabled: true },
  { key: "request_money", label: "Request Money", description: "Allow users to request money from others.", side: "user", defaultEnabled: true },
  { key: "voucher", label: "Voucher", description: "Allow users to generate and redeem vouchers.", side: "user", defaultEnabled: true },
  { key: "referrals", label: "Referrals", description: "Allow users to refer others and earn referral rewards.", side: "user", defaultEnabled: true },
  { key: "wallets", label: "Wallets", description: "Show the Wallets page (balances and per-wallet activity).", side: "user", defaultEnabled: true },
  { key: "statistic", label: "Statistic", description: "Show the Statistic page (charts of money in/out).", side: "user", defaultEnabled: true },
  { key: "transactions", label: "Transactions", description: "Show the Transactions history page.", side: "user", defaultEnabled: true },
  { key: "support", label: "Support", description: "Allow users to open and reply to support tickets.", side: "user", defaultEnabled: true },
  { key: "maintenance_mode", label: "Maintenance Mode", description: "Take the user-facing site offline with a notice. The admin panel stays accessible.", side: "admin", defaultEnabled: false },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number]["key"];
export type FeatureFlagSide = "user" | "admin";

export interface FeatureFlagView {
  key: FeatureFlagKey;
  label: string;
  description: string;
  side: FeatureFlagSide;
  enabled: boolean;
}

const FLAG_KEYS = FEATURE_FLAGS.map((flag) => flag.key) as readonly string[];

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return FLAG_KEYS.includes(key);
}

// Whether a single allowlisted flag is on, using the compile-time fallback when no row
// exists (fail-closed to the declared default). Used by per-surface enforcement guards, e.g.
// the /register route gates on "registration".
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const fallback = FEATURE_FLAGS.find((flag) => flag.key === key)?.defaultEnabled ?? false;
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  return row?.enabled ?? fallback;
}

// Every enabled flag key, in ONE query. The nav asks about a dozen flags per render, and
// isFeatureEnabled is a query each — this is the batched read for that case. Wrapped in React's
// cache so the layout and a page in the same request share one round-trip.
export const getEnabledFlags = cache(async (): Promise<Set<string>> => {
  const rows = await prisma.featureFlag.findMany({ where: { key: { in: [...FLAG_KEYS] } } });
  const byKey = new Map(rows.map((row) => [row.key, row.enabled]));
  const enabled = new Set<string>();
  for (const flag of FEATURE_FLAGS) {
    if (byKey.get(flag.key) ?? flag.defaultEnabled) enabled.add(flag.key);
  }
  return enabled;
});

// The current state of every allowlisted flag, defaulting to the compile-time fallback when
// no row exists. Merges DB rows over the allowlist so a removed key never leaks into the UI.
export async function getFeatureFlags(): Promise<FeatureFlagView[]> {
  const rows = await prisma.featureFlag.findMany({
    where: { key: { in: [...FLAG_KEYS] } },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.enabled]));
  return FEATURE_FLAGS.map((flag) => ({
    key: flag.key,
    label: flag.label,
    description: flag.description,
    side: flag.side,
    enabled: byKey.get(flag.key) ?? flag.defaultEnabled,
  }));
}
