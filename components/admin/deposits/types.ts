// Types for the Deposits admin area (/admin/deposits). DepositMethod references the
// shared PaymentGateway + Currency models (see prisma schema comments); the dropdown
// option shapes below are slim projections of those shared models.

import type { MethodFieldType } from "@/lib/method-fields";

export type DepositMethodType = "auto" | "manual";
export type ChargeType = "percent" | "fixed";
// "select" renders a dropdown of the admin's own `options` (e.g. Account Type → Savings/Current);
// every other type ignores options. lib/method-fields owns the list — the Withdrawals area
// builds the same fields with the same builder.
export type ManualFieldType = MethodFieldType;
export type DepositStatus = "pending" | "completed" | "canceled" | "failed";

export interface ManualMethodField {
  id: string;
  label: string;
  type: ManualFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
}

export interface DepositMethod {
  id: string;
  type: DepositMethodType;
  name: string;
  symbol: string;
  methodCode: string | null;
  logo: string | null;
  currencyId: string;
  currencyCode: string;
  paymentGatewayId: string | null;
  gatewayName: string | null;
  gatewayLogo: string | null;
  rate: number;
  chargeType: ChargeType;
  chargeValue: number;
  minAmount: number;
  maxAmount: number;
  instructions: string | null;
  isActive: boolean;
  fields: ManualMethodField[];
}

// Slim projections of the shared PaymentGateway / Currency models for the form selects.
export interface GatewayOption {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
}
export interface CurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface DepositUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// Tab 1 — a pending manual deposit awaiting review (fieldValues are a submission-time
// snapshot of the method's custom fields, so they survive later method edits).
export interface DepositRequest {
  id: string;
  txnId: string;
  user: DepositUserSummary;
  methodName: string;
  provider: string | null;
  amount: number;
  fee: number;
  currency: string;
  symbol: string;
  description: string | null;
  fieldValues: { label: string; value: string }[];
  createdAt: string;
}

// Tab 4 — a deposit history row (any status).
export interface DepositHistory {
  id: string;
  txnId: string;
  user: DepositUserSummary;
  provider: string | null;
  amount: number;
  fee: number;
  currency: string;
  description: string | null;
  status: DepositStatus;
  createdAt: string;
}

// ----- payloads -----

export interface DepositMethodFieldPayload {
  label: string;
  type: ManualFieldType;
  required: boolean;
  options: string[];
}

export interface DepositMethodPayload {
  type: DepositMethodType;
  name: string;
  symbol: string;
  methodCode: string | null;
  logo: string | null;
  currencyId: string;
  paymentGatewayId: string | null;
  rate: number;
  chargeType: ChargeType;
  chargeValue: number;
  minAmount: number;
  maxAmount: number;
  instructions: string | null;
  isActive: boolean;
  fields: DepositMethodFieldPayload[];
}
