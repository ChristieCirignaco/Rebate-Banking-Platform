import { prisma } from "@/lib/db";

// Compile-time allowlist of togglable features (spec §8: DB-backed flags from a known-key
// allowlist, fail-closed). `side` groups them in the UI; `defaultEnabled` is the fallback
// when no row exists yet. Enforcement guards are wired per-surface in a later pass — this
// is the control panel + persistence.
export const FEATURE_FLAGS = [
  { key: "deposits", label: "Deposits", description: "Allow users to fund their wallet.", side: "user", defaultEnabled: true },
  { key: "withdrawals", label: "Withdrawals", description: "Allow users to withdraw funds.", side: "user", defaultEnabled: true },
  { key: "registration", label: "Registration", description: "Allow new users to sign up.", side: "user", defaultEnabled: true },
  { key: "product_submission", label: "Product / Rebate Submission", description: "Allow users to submit products for rebate review.", side: "user", defaultEnabled: true },
  { key: "kyc_submission", label: "KYC Submission", description: "Allow users to submit identity verification.", side: "user", defaultEnabled: true },
  { key: "exchange", label: "Currency Exchange", description: "Allow in-wallet currency conversion.", side: "user", defaultEnabled: true },
  { key: "send_money", label: "Send Money", description: "Allow user-to-user transfers.", side: "user", defaultEnabled: true },
  { key: "request_money", label: "Request Money", description: "Allow users to request money from others.", side: "user", defaultEnabled: true },
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
