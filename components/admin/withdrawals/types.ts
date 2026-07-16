// Types for the Withdrawals admin area (/admin/withdrawals). Mirrors the Deposits types
// (WithdrawMethod references the shared PaymentGateway + Currency models) with two
// additions: a manual method's Process Time, and the weekly auto-processing schedule.

import type { MethodFieldType } from "@/lib/method-fields";

export type WithdrawMethodType = "auto" | "manual";
export type ChargeType = "percent" | "fixed";
// The field types are shared with the Deposits area — lib/method-fields owns the list.
export type ManualFieldType = MethodFieldType;
export type WithdrawStatus = "pending" | "completed" | "canceled" | "failed";
export type ProcessTimeUnit = "minute" | "hour" | "day";

export interface ManualMethodField {
  id: string;
  label: string;
  type: ManualFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
}

export interface WithdrawMethod {
  id: string;
  type: WithdrawMethodType;
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
  processTimeValue: number | null;
  processTimeUnit: ProcessTimeUnit | null;
  isActive: boolean;
  fields: ManualMethodField[];
}

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

export interface WithdrawUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface WithdrawRequest {
  id: string;
  txnId: string;
  user: WithdrawUserSummary;
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

export interface WithdrawHistory {
  id: string;
  txnId: string;
  user: WithdrawUserSummary;
  provider: string | null;
  amount: number;
  fee: number;
  currency: string;
  description: string | null;
  status: WithdrawStatus;
  createdAt: string;
}

// Seven entries (day 0 = Sunday … 6 = Saturday).
export interface WithdrawScheduleDay {
  day: number;
  enabled: boolean;
}

// ----- payloads -----

export interface WithdrawMethodFieldPayload {
  label: string;
  type: ManualFieldType;
  required: boolean;
  options: string[];
}

export interface WithdrawMethodPayload {
  type: WithdrawMethodType;
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
  processTimeValue: number | null;
  processTimeUnit: ProcessTimeUnit | null;
  isActive: boolean;
  fields: WithdrawMethodFieldPayload[];
}

export interface WithdrawSchedulePayload {
  days: WithdrawScheduleDay[];
}
