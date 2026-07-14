// Types for the currency / wallet management area (/admin/currencies). Presentation
// components are driven by these; live rows map into them in lib/admin/currencies.ts,
// and the form dialog posts CurrencyFormPayload to app/admin/currencies/actions.ts.

export type CurrencyType = "fiat" | "crypto";
export type FeeType = "percent" | "fixed";
export type CurrencyRoleKey = "sender" | "voucher" | "payment" | "withdraw";

// Reduced role set (legacy also had REQUEST_MONEY + EXCHANGE — intentionally dropped).
export const CURRENCY_ROLES: { key: CurrencyRoleKey; label: string }[] = [
  { key: "sender", label: "Sender" },
  { key: "voucher", label: "Voucher" },
  { key: "payment", label: "Payment" },
  { key: "withdraw", label: "Withdraw" },
];

export interface CurrencyRoleConfig {
  role: CurrencyRoleKey;
  feeType: FeeType;
  feeValue: number;
  minAmount: number;
  maxAmount: number;
  enabled: boolean;
}

export interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  flagUrl?: string;
  rate: number; // units of this currency per 1 unit of the default currency
  autoWallet: boolean;
  isDefault: boolean;
  isActive: boolean;
  roles: CurrencyRoleConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyListResult {
  rows: CurrencyItem[];
  defaultCode: string; // base currency for the "1 <base> = <rate> <code>" line
}

// ----- Form / action payloads -----

export interface CurrencyRolePayload {
  role: CurrencyRoleKey;
  feeType: FeeType;
  feeValue: number;
  minAmount: number;
  maxAmount: number;
  enabled: boolean;
}

export interface CurrencyFormPayload {
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  flagUrl: string | null;
  rate: number;
  autoWallet: boolean;
  isDefault: boolean;
  isActive: boolean;
  roles: CurrencyRolePayload[];
}
