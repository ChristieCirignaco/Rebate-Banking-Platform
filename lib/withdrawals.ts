import { controlAllows } from "@/lib/controls";
import { prisma } from "@/lib/db";
import { requirementBlock } from "@/lib/user-gates";
import { formatCurrency } from "@/lib/format";
import type { MethodFieldType } from "@/lib/method-fields";
import { toMajor } from "@/lib/money/money";
import { loadUserWallets } from "@/lib/wallets";
import { getSettings } from "@/lib/settings/store";

// User-facing withdrawal reads. A withdrawal goes to a saved WithdrawalAccount (a bank account or
// crypto address the user defined once from an admin-configured WithdrawMethod's fields). Methods
// are bound to a currency, and the currency's type decides whether it's a bank or crypto method.

export type WithdrawKind = "bank" | "crypto";
export type WithdrawFieldType = MethodFieldType;

export type WithdrawWalletView = {
  id: string;
  currency: string;
  balance: number; // major
  balanceLabel: string;
  label: string;
};

export type WithdrawMethodView = {
  id: string;
  name: string;
  kind: WithdrawKind;
  currency: string;
  feeLabel: string;
  limitLabel: string | null;
  fields: {
    id: string;
    label: string;
    type: WithdrawFieldType;
    required: boolean;
    options: string[];
  }[];
};

export type WithdrawAccountView = {
  id: string;
  label: string;
  kind: WithdrawKind;
  currency: string;
  methodId: string;
  methodName: string;
  chargeType: "percent" | "fixed";
  chargeValue: number;
  minAmount: number; // method min (0 = none)
  maxAmount: number; // method max (0 = none)
  summary: string; // a short preview of the stored fields
};

export type WithdrawGate = { allowed: boolean; reason: string | null };

export type WithdrawData = {
  wallets: WithdrawWalletView[];
  methods: WithdrawMethodView[];
  accounts: WithdrawAccountView[];
  hasPin: boolean;
  gate: WithdrawGate;
  limits: { min: number; max: number; dailyLimit: number };
};

export function kindForCurrencyType(type: string): WithdrawKind {
  return type === "crypto" ? "crypto" : "bank";
}

function feeLabel(chargeType: string, value: number, currency: string): string {
  if (value <= 0) return "No fee";
  return chargeType === "percent" ? `${value}% fee` : `${formatCurrency(value, currency)} fee`;
}
function limitLabel(min: number, max: number, currency: string): string | null {
  const parts: string[] = [];
  if (min > 0) parts.push(`min ${formatCurrency(min, currency)}`);
  if (max > 0) parts.push(`max ${formatCurrency(max, currency)}`);
  return parts.length ? parts.join(" · ") : null;
}

export function toFieldValues(raw: unknown): { label: string; value: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    if (typeof o.label !== "string" || typeof o.value !== "string") return [];
    return [{ label: o.label, value: o.value }];
  });
}

function summarize(values: { label: string; value: string }[]): string {
  return values
    .map((v) => v.value)
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ")
    .slice(0, 80);
}

// The admin's per-user withdrawal status (set in Users → detail → withdrawal control). Anything
// other than "allowed" blocks; the admin's own userMessage wins over these defaults.
const FALLBACK_REASON = "Withdrawals are unavailable on your account. Please contact support.";
const STATUS_REASON: Record<string, string> = {
  pending: "Your withdrawals are under review. Please check back shortly.",
  hold: "Withdrawals are on hold for your account. Please contact support.",
  suspended: "Withdrawals are suspended on your account. Please contact support.",
  restricted: "Withdrawals are restricted on your account. Please contact support.",
};

// Whether this user may withdraw at all: the per-user withdrawal status/message the admin sets,
// the "withdraw" capability control, and the KYC requirement from Settings → Limits.
export async function getWithdrawGate(userId: string): Promise<WithdrawGate> {
  const [user, limits] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        controls: true,
        withdrawalStatus: true,
        withdrawalMessage: true,
        kycStatus: true,
        emailVerified: true,
      },
    }),
    getSettings("limits"),
  ]);
  if (!user) return { allowed: false, reason: "Account not found." };

  if (!controlAllows(user.controls, "withdraw")) {
    return { allowed: false, reason: "Withdrawals are disabled on your account. Please contact support." };
  }
  // The account-wide requirement controls (verified email / approved KYC) apply here too — the
  // global kycRequiredForWithdrawal below is the same rule for everyone rather than per user.
  const requirement = requirementBlock(user);
  if (requirement) return { allowed: false, reason: requirement };
  if (user.withdrawalStatus && user.withdrawalStatus !== "allowed") {
    return {
      allowed: false,
      reason: user.withdrawalMessage?.trim() || STATUS_REASON[user.withdrawalStatus] || FALLBACK_REASON,
    };
  }
  if (limits.kycRequiredForWithdrawal && user.kycStatus !== "approved") {
    return { allowed: false, reason: "Complete identity verification before withdrawing." };
  }
  return { allowed: true, reason: null };
}

export async function getWithdrawData(userId: string): Promise<WithdrawData> {
  const [wallets, user, accountRows, gate, limits] = await Promise.all([
    loadUserWallets(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } }),
    prisma.withdrawalAccount.findMany({
      where: { userId },
      include: {
        method: {
          select: {
            name: true,
            chargeType: true,
            chargeValue: true,
            minAmount: true,
            maxAmount: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getWithdrawGate(userId),
    getSettings("limits"),
  ]);

  const currencies = [...new Set(wallets.map((w) => w.currency))];
  const methodRows = currencies.length
    ? await prisma.withdrawMethod.findMany({
        where: {
          isActive: true,
          currency: { code: { in: currencies }, isActive: true },
          // A method with no admin-defined fields can't collect a payout destination, so an
          // account for it would be unpayable — don't offer it until the admin adds fields.
          fields: { some: {} },
        },
        include: {
          currency: { select: { code: true, type: true } },
          fields: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { name: "asc" },
      })
    : [];

  return {
    wallets: wallets.map((w) => ({
      id: w.id,
      currency: w.currency,
      balance: toMajor(w.balanceMinor),
      balanceLabel: formatCurrency(toMajor(w.balanceMinor), w.currency),
      label: `${w.currency} Wallet`,
    })),
    methods: methodRows.map((m) => {
      const currency = m.currency.code;
      return {
        id: m.id,
        name: m.name,
        kind: kindForCurrencyType(m.currency.type),
        currency,
        feeLabel: feeLabel(m.chargeType, Number(m.chargeValue), currency),
        limitLabel: limitLabel(Number(m.minAmount), Number(m.maxAmount), currency),
        fields: m.fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type as WithdrawFieldType,
          required: f.required,
          options: f.options,
        })),
      };
    }),
    accounts: accountRows
      .filter((a) => a.method.isActive)
      .map((a) => ({
        id: a.id,
        label: a.label,
        kind: a.kind as WithdrawKind,
        currency: a.currency,
        methodId: a.withdrawMethodId,
        methodName: a.method.name,
        chargeType: (a.method.chargeType === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
        chargeValue: Number(a.method.chargeValue),
        minAmount: Number(a.method.minAmount),
        maxAmount: Number(a.method.maxAmount),
        summary: summarize(toFieldValues(a.fieldValues)),
      })),
    hasPin: Boolean(user?.transactionPin),
    gate,
    limits: {
      min: limits.withdrawalMin,
      max: limits.withdrawalMax,
      dailyLimit: limits.withdrawalDailyLimit,
    },
  };
}
