import type { ComponentType } from "react";

// Shared data shapes for the admin overview. Keep presentation components driven by
// these so the mock data in mock-data.ts can be swapped for real API data later.

export type StatTint =
  "emerald" | "blue" | "violet" | "amber" | "rose" | "cyan";

export interface StatWidget {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tint: StatTint;
  href: string;
  isCurrency?: boolean;
  currency?: string;
}

export interface TimeSeriesPoint {
  date: string; // ISO yyyy-mm-dd
  value: number;
}

export interface WalletSummaryItem {
  currency: string; // ISO 4217, e.g. "USD"
  name: string; // e.g. "US Dollar"
  walletCount: number;
  balance: number;
}

export type TransactionType = "deposit" | "withdrawal" | "rebate" | "fee";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface TransactionRow {
  id: string;
  user: string;
  amount: number; // signed: negative = debit
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string; // ISO
}

export interface LatestUserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  verified: boolean;
  joinedAt: string; // ISO
}
