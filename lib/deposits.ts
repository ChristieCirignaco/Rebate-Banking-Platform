import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import { sanitizeHtml } from "@/lib/sanitize-html";

// User-facing deposit reads: the caller's wallets + the active deposit methods available for
// those wallet currencies (a DepositMethod is bound to one currency). Presentation is folded
// here so the client form stays serialization-clean.

export type DepositManualField = {
  id: string;
  label: string;
  type: "input" | "textarea" | "file";
  required: boolean;
};

export type DepositWalletView = {
  id: string;
  currency: string;
  balanceLabel: string;
  label: string; // "USD Wallet"
};

export type DepositMethodView = {
  id: string;
  type: "auto" | "manual";
  name: string;
  currency: string;
  chargeType: "percent" | "fixed";
  chargeValue: number;
  feeLabel: string;
  minAmount: number;
  maxAmount: number; // 0 = no cap
  limitLabel: string | null;
  instructionsHtml: string | null; // sanitized
  fields: DepositManualField[];
  gatewayName: string | null;
};

export type DepositData = {
  wallets: DepositWalletView[];
  methods: DepositMethodView[];
  hasPin: boolean;
};

function feeLabel(type: "percent" | "fixed", value: number, currency: string): string {
  if (value <= 0) return "No fee";
  return type === "percent" ? `${value}% fee` : `${formatCurrency(value, currency)} fee`;
}

function limitLabel(min: number, max: number, currency: string): string | null {
  const parts: string[] = [];
  if (min > 0) parts.push(`min ${formatCurrency(min, currency)}`);
  if (max > 0) parts.push(`max ${formatCurrency(max, currency)}`);
  return parts.length ? parts.join(" · ") : null;
}

export async function getDepositData(userId: string): Promise<DepositData> {
  const [wallets, user] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } }),
  ]);

  const currencies = [...new Set(wallets.map((w) => w.currency))];
  const methodRows = currencies.length
    ? await prisma.depositMethod.findMany({
        where: { isActive: true, currency: { code: { in: currencies } } },
        include: {
          currency: { select: { code: true } },
          paymentGateway: { select: { name: true } },
          fields: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const methods: DepositMethodView[] = methodRows.map((m) => {
    const currency = m.currency.code;
    const chargeValue = Number(m.chargeValue);
    const minAmount = Number(m.minAmount);
    const maxAmount = Number(m.maxAmount);
    return {
      id: m.id,
      type: m.type as "auto" | "manual",
      name: m.name,
      currency,
      chargeType: m.chargeType as "percent" | "fixed",
      chargeValue,
      feeLabel: feeLabel(m.chargeType as "percent" | "fixed", chargeValue, currency),
      minAmount,
      maxAmount,
      limitLabel: limitLabel(minAmount, maxAmount, currency),
      instructionsHtml: m.instructions ? sanitizeHtml(m.instructions) : null,
      fields: m.fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type as "input" | "textarea" | "file",
        required: f.required,
      })),
      gatewayName: m.paymentGateway?.name ?? null,
    };
  });

  return {
    wallets: wallets.map((w) => ({
      id: w.id,
      currency: w.currency,
      balanceLabel: formatCurrency(toMajor(w.balanceMinor), w.currency),
      label: `${w.currency} Wallet`,
    })),
    methods,
    hasPin: Boolean(user?.transactionPin),
  };
}
