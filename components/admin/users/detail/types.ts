import type { ComponentType } from "react";

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
  phone: string;
  gender: Gender;
  birthday: string; // ISO yyyy-mm-dd
  country: string;
  address: string;
  avatarUrl?: string;
  lastLogin?: string; // ISO
  browser: string; // e.g. "Chrome on macOS"
  withdrawalStatus: WithdrawalStatus;
  withdrawalMessage: string; // message shown to the user when withdrawals are restricted
}

export interface DetailWallet {
  currency: string; // USD / EUR / USDT
  name: string; // "US Dollar"
  balance: number;
  isDefault: boolean;
}

export type ControlKey =
  | "account_status"
  | "email_verification"
  | "kyc_verification"
  | "deposit"
  | "exchange_money"
  | "send_money"
  | "request_money"
  | "withdraw";

export interface UserControl {
  key: ControlKey;
  label: string;
  description: string;
  enabled: boolean;
}

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
  browser: string; // "Chrome"
  os: string; // "macOS"
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
  adminNote?: string;
  userMessage?: string;
}
