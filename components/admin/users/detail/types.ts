import type { ComponentType } from "react";

import type { ControlKind } from "@/lib/controls";

// -----------------------------------------------------------------------------
// Types for the inner user management page (/admin/users/[id]). Presentation is
// driven entirely by these; live data is mapped into them in lib/admin/user-detail.ts.
// Every action is surfaced as a handler prop wired to app/admin/users/[id]/actions.ts.
// -----------------------------------------------------------------------------

export type Gender = "male" | "female" | "other" | "unspecified";

export interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // full name
  username: string;
  email: string;
  emailVerified: boolean;
  joinedAt: string; // ISO — account creation date, shown in the delete-confirmation modal
  phone: string;
  gender: Gender;
  birthday: string; // ISO yyyy-mm-dd
  country: string;
  address: string;
  avatarUrl?: string;
  accountStatus: "active" | "suspended" | "pending"; // sign-in status (rejected registrations are suspended)
  lastLogin?: string; // ISO
  browser: string; // e.g. "Chrome on macOS"
  withdrawalStatus: WithdrawalStatus;
  // Security state (admin-managed from the Security tab). Never the secrets themselves — only
  // whether each is set, so the UI can offer the right action.
  hasPassword: boolean;
  hasPin: boolean;
  twoFactorEnabled: boolean;
  activeSessions: number;
  withdrawalMessage: string; // message shown to the user when withdrawals are restricted
}

export interface DetailWallet {
  id: string;
  currency: string; // USD / EUR / USDT
  name: string; // "US Dollar"
  balance: number;
  isDefault: boolean;
  // Whether this wallet can be removed at all. Computed server-side because the reasons are
  // server facts (it's the primary, it holds a balance, it has ledger history, or it's the
  // user's last wallet) — the trash control uses it to explain itself instead of failing.
  removable: boolean;
  removeBlockedReason: string | null;
}

// Runtime list is the single source of truth so a Server Action can validate an incoming key
// (a payload is caller-controlled) without drifting from the ControlKey union.
export const CONTROL_KEYS = [
  "account_status",
  "email_verification",
  "kyc_verification",
  "deposit",
  "exchange_money",
  "send_money",
  "request_money",
  "voucher",
  "withdraw",
] as const;

export type ControlKey = (typeof CONTROL_KEYS)[number];

export interface UserControl {
  key: ControlKey;
  label: string;
  description: string;
  // "capability" = allowed until switched off; "requirement" = off until switched on. See
  // lib/controls.ts — it decides how an unset key reads and how the toggle renders.
  kind: ControlKind;
  enabled: boolean;
}

// The stat tiles, in render order. This list is the CONTRACT between the computation
// (lib/admin/user-detail) and the grid: statValues is keyed by it, so a metric with no
// computation is a compile error rather than a silent 0.00 — which is how nine of these
// shipped reading zero.
export const STAT_LABELS = [
  "Total Trx",
  "Completed Trx",
  "Pending Trx",
  "Failed Trx",
  "Deposit",
  "Send Money",
  "Request Money",
  "Exchange Money",
  "Withdraw",
  "Voucher",
  "Reward",
  "Total Wallets",
  "Total Balance",
  "Total Products",
  "Pending Products",
  "Approved Products",
  "Rejected Products",
  "Support Tickets",
  "Referrals Made",
] as const;

export type StatLabel = (typeof STAT_LABELS)[number];

export interface UserStat {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  isCurrency?: boolean;
  currency?: string;
}

export interface TxnSummaryPoint {
  date: string; // ISO yyyy-mm-dd
  completed: number;
  pending: number;
  failed: number;
}

export type DetailTxnType =
  | "deposit"
  | "withdraw"
  | "send"
  | "request"
  | "exchange"
  | "payment"
  | "reward";
export type DetailTxnStatus = "completed" | "pending" | "failed";

export interface DetailTransaction {
  id: string; // TRX id
  description: string;
  provider: string;
  amount: number; // signed: negative = debit
  currency: string;
  type: DetailTxnType;
  status: DetailTxnStatus;
  createdAt: string; // ISO
}

export interface ReferralUser {
  id: string;
  name: string;
  email: string;
  joinedAt: string; // ISO
  avatarUrl?: string;
}

export interface ActivityEntry {
  id: string;
  loginAt: string; // ISO
  ip: string;
  country: string;
  org?: string; // network / operator, when resolved via IPinfo
  browser: string; // "Chrome"
  os: string; // "macOS"
  // Set when this session is an admin "Login as User" impersonation — the acting admin's name,
  // shown as the audit log. Absent for the user's own real logins.
  impersonatorName?: string;
}

// ----- Dialog handler payloads -----

export type NotificationType = "email" | "push";
export interface NotifyPayload {
  type: NotificationType;
  title?: string;
  message: string;
  scheduleAt?: string;
}

export type BalanceOp = "credit" | "debit";
export interface ManageFundsPayload {
  walletCurrency: string;
  op: BalanceOp;
  description?: string;
  amount: number;
  adminNote?: string;
  // Client-generated nonce: makes an accidental double-submit idempotent server-side.
  requestId: string;
}

export type TransferCodeGroup = "imf" | "tax" | "cot";
export type TransferCodes = Record<TransferCodeGroup, string[]>;

export type WithdrawalStatus =
  "allowed" | "pending" | "hold" | "suspended" | "restricted";
export interface WithdrawalControlPayload {
  status: WithdrawalStatus;
  userMessage?: string;
}
