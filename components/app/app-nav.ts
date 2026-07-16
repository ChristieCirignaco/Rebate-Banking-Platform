import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChartColumn,
  HandCoins,
  House,
  LifeBuoy,
  Package,
  Receipt,
  Send,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Type-only: lib/settings/feature-flags imports Prisma, and this module is pulled into client
// components. An erased type import is safe; importing a runtime value from there would drag
// the whole DB client into the browser bundle.
import type { FeatureFlagKey } from "@/lib/settings/feature-flags";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // The flag that shows this entry. Omitted = always visible (Dashboard is the app's floor —
  // every feature guard redirects there, so it can't be switchable).
  flag?: FeatureFlagKey;
};

// The single source of truth for the user-area navigation, shared by the desktop sidebar and
// the mobile drawer so they can never drift.
export const APP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/wallet", label: "Wallets", icon: Wallet, flag: "wallets" },
  { href: "/statistic", label: "Statistic", icon: ChartColumn, flag: "statistic" },
  { href: "/products", label: "Products", icon: Package, flag: "products" },
  { href: "/send", label: "Send Money", icon: Send, flag: "send_money" },
  { href: "/deposit", label: "Deposit Money", icon: ArrowDownToLine, flag: "deposits" },
  { href: "/withdraw", label: "Withdrawals", icon: ArrowUpFromLine, flag: "withdrawals" },
  { href: "/request", label: "Request Money", icon: HandCoins, flag: "request_money" },
  { href: "/exchange", label: "Exchange Money", icon: ArrowLeftRight, flag: "exchange" },
  { href: "/voucher", label: "Voucher", icon: Ticket, flag: "voucher" },
  { href: "/transactions", label: "Transactions", icon: Receipt, flag: "transactions" },
  { href: "/referrals", label: "Referrals", icon: Users, flag: "referrals" },
  { href: "/kyc", label: "Verification", icon: ShieldCheck, flag: "kyc_submission" },
  { href: "/support", label: "Support", icon: LifeBuoy, flag: "support" },
];

// Pure + client-safe: the server resolves the flags once (getEnabledFlags) and hands the keys
// down, so the nav can be filtered without either component touching the database. Hiding is
// only half the job — each gated route redirects too, since a URL is still typeable.
export function visibleNav(enabled: Iterable<string>): NavItem[] {
  const on = enabled instanceof Set ? enabled : new Set(enabled);
  return APP_NAV.filter((item) => !item.flag || on.has(item.flag));
}

// Each transfer type is separately switchable, so an operator can offer internal transfers but
// not wire without touching code. Keyed by the same strings the send form and beginTransfer use,
// so a type can never be offered under a flag that doesn't exist.
export const TRANSFER_TYPE_FLAGS = {
  internal: "transfer_internal",
  domestic: "transfer_domestic",
  wire: "transfer_wire",
} as const satisfies Record<string, FeatureFlagKey>;

export type TransferKind = keyof typeof TRANSFER_TYPE_FLAGS;

export function enabledTransferKinds(enabled: Iterable<string>): TransferKind[] {
  const on = enabled instanceof Set ? enabled : new Set(enabled);
  return (Object.keys(TRANSFER_TYPE_FLAGS) as TransferKind[]).filter((kind) =>
    on.has(TRANSFER_TYPE_FLAGS[kind]),
  );
}
