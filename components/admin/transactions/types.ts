// Shared types for the site-wide transactions (wallet ledger) view.

export type TransactionStatus = "completed" | "pending" | "failed";
export type TransactionDirection = "credit" | "debit";

// Ledger sources (see WalletTransaction.source). Kept as a list for the filter dropdown;
// unknown/legacy values still render (source is a plain string on the row).
export const TRANSACTION_SOURCES = [
  "deposit",
  "withdrawal",
  "withdrawal_reversal",
  "adjustment",
  "fee",
  "transfer",
  "rebate",
  "reward",
] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export interface TransactionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TransactionView {
  id: string;
  user: TransactionUser;
  currency: string;
  direction: TransactionDirection;
  amount: number; // signed major units (credit +, debit −)
  source: string;
  status: TransactionStatus;
  provider: string | null;
  description: string | null;
  memo: string | null;
  referenceType: string | null;
  referenceId: string | null;
  balanceAfter: number; // major units
  createdAt: string; // ISO
}

export interface TransactionsResult {
  rows: TransactionView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
  source?: TransactionSource | "all";
  status?: TransactionStatus | "all";
  direction?: TransactionDirection | "all";
}
