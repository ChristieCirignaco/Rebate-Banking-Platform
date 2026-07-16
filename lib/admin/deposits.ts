import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toMajor } from "@/lib/money/money";
import type {
  ChargeType,
  CurrencyOption,
  DepositHistory,
  DepositMethod,
  DepositMethodType,
  DepositRequest,
  DepositStatus,
  GatewayOption,
  ManualFieldType,
} from "@/components/admin/deposits/types";

const methodInclude = {
  currency: { select: { code: true } },
  paymentGateway: { select: { name: true, logo: true } },
  fields: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.DepositMethodInclude;

type MethodRow = Prisma.DepositMethodGetPayload<{ include: typeof methodInclude }>;

function toMethod(row: MethodRow): DepositMethod {
  return {
    id: row.id,
    type: row.type as DepositMethodType,
    name: row.name,
    symbol: row.symbol,
    methodCode: row.methodCode,
    logo: row.logo,
    currencyId: row.currencyId,
    currencyCode: row.currency.code,
    paymentGatewayId: row.paymentGatewayId,
    gatewayName: row.paymentGateway?.name ?? null,
    gatewayLogo: row.paymentGateway?.logo ?? null,
    rate: Number(row.rate),
    chargeType: row.chargeType as ChargeType,
    chargeValue: Number(row.chargeValue),
    minAmount: Number(row.minAmount),
    maxAmount: Number(row.maxAmount),
    instructions: row.instructions,
    isActive: row.isActive,
    fields: row.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type as ManualFieldType,
      required: field.required,
      options: field.options,
      sortOrder: field.sortOrder,
    })),
  };
}

export async function getDepositMethods(
  type: DepositMethodType,
): Promise<DepositMethod[]> {
  const rows = await prisma.depositMethod.findMany({
    where: { type },
    include: methodInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(toMethod);
}

export async function getDepositMethod(id: string): Promise<DepositMethod | null> {
  const row = await prisma.depositMethod.findUnique({
    where: { id },
    include: methodInclude,
  });
  return row ? toMethod(row) : null;
}

// The custom-field values are stored as a submission-time snapshot ({label,value}[]);
// coerce defensively since it's a JSON column.
function toFieldValues(raw: Prisma.JsonValue | null): { label: string; value: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label: string; value: string }[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      out.push({ label: String(record.label ?? ""), value: String(record.value ?? "") });
    }
  }
  return out;
}

const requestInclude = {
  user: { select: { id: true, name: true, email: true, image: true } },
  method: { select: { name: true, symbol: true } },
} satisfies Prisma.DepositInclude;

type RequestRow = Prisma.DepositGetPayload<{ include: typeof requestInclude }>;

function toRequest(row: RequestRow): DepositRequest {
  return {
    id: row.id,
    txnId: row.txnId,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      avatarUrl: row.user.image ?? undefined,
    },
    methodName: row.method?.name ?? row.provider ?? "Manual deposit",
    provider: row.provider,
    amount: toMajor(row.amountMinor),
    fee: toMajor(row.feeMinor),
    currency: row.currency,
    symbol: row.method?.symbol ?? row.currency,
    description: row.description,
    fieldValues: toFieldValues(row.fieldValues),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getManualRequests(): Promise<DepositRequest[]> {
  const rows = await prisma.deposit.findMany({
    where: { type: "manual", status: "pending" },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRequest);
}

export async function getManualRequest(id: string): Promise<DepositRequest | null> {
  const row = await prisma.deposit.findUnique({ where: { id }, include: requestInclude });
  return row ? toRequest(row) : null;
}

const HISTORY_LIMIT = 300;

export async function getDepositHistory(): Promise<DepositHistory[]> {
  const rows = await prisma.deposit.findMany({
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    txnId: row.txnId,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      avatarUrl: row.user.image ?? undefined,
    },
    provider: row.provider,
    amount: toMajor(row.amountMinor),
    fee: toMajor(row.feeMinor),
    currency: row.currency,
    description: row.description,
    status: row.status as DepositStatus,
    createdAt: row.createdAt.toISOString(),
  }));
}

// Slim dropdown options projected from the shared models (no gateway secrets).
export async function getGatewayOptions(): Promise<GatewayOption[]> {
  const rows = await prisma.paymentGateway.findMany({
    select: { id: true, slug: true, name: true, logo: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function getCurrencyOptions(): Promise<CurrencyOption[]> {
  const rows = await prisma.currency.findMany({
    select: { id: true, code: true, name: true, symbol: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
  return rows;
}
