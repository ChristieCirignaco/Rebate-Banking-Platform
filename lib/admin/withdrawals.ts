import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toMajor } from "@/lib/money/money";
import type {
  ChargeType,
  CurrencyOption,
  GatewayOption,
  ManualFieldType,
  ProcessTimeUnit,
  WithdrawHistory,
  WithdrawMethod,
  WithdrawMethodType,
  WithdrawRequest,
  WithdrawScheduleDay,
  WithdrawStatus,
} from "@/components/admin/withdrawals/types";

const methodInclude = {
  currency: { select: { code: true } },
  paymentGateway: { select: { name: true, logo: true } },
  fields: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.WithdrawMethodInclude;

type MethodRow = Prisma.WithdrawMethodGetPayload<{ include: typeof methodInclude }>;

function toMethod(row: MethodRow): WithdrawMethod {
  return {
    id: row.id,
    type: row.type as WithdrawMethodType,
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
    processTimeValue: row.processTimeValue,
    processTimeUnit: (row.processTimeUnit as ProcessTimeUnit | null) ?? null,
    isActive: row.isActive,
    fields: row.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type as ManualFieldType,
      required: field.required,
      sortOrder: field.sortOrder,
    })),
  };
}

export async function getWithdrawMethods(
  type: WithdrawMethodType,
): Promise<WithdrawMethod[]> {
  const rows = await prisma.withdrawMethod.findMany({
    where: { type },
    include: methodInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(toMethod);
}

export async function getWithdrawMethod(id: string): Promise<WithdrawMethod | null> {
  const row = await prisma.withdrawMethod.findUnique({
    where: { id },
    include: methodInclude,
  });
  return row ? toMethod(row) : null;
}

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
} satisfies Prisma.WithdrawInclude;

type RequestRow = Prisma.WithdrawGetPayload<{ include: typeof requestInclude }>;

function toRequest(row: RequestRow): WithdrawRequest {
  return {
    id: row.id,
    txnId: row.txnId,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      avatarUrl: row.user.image ?? undefined,
    },
    methodName: row.method?.name ?? row.provider ?? "Manual withdrawal",
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

export async function getManualRequests(): Promise<WithdrawRequest[]> {
  const rows = await prisma.withdraw.findMany({
    where: { type: "manual", status: "pending" },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRequest);
}

export async function getManualRequest(id: string): Promise<WithdrawRequest | null> {
  const row = await prisma.withdraw.findUnique({ where: { id }, include: requestInclude });
  return row ? toRequest(row) : null;
}

export interface WithdrawHistoryResult {
  rows: WithdrawHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WithdrawHistoryParams {
  page?: number;
  pageSize?: number;
  status?: WithdrawStatus | "all";
  search?: string;
  from?: string;
  to?: string;
}

const HISTORY_PAGE_SIZE = 10;

// Server-driven, paginated history (the spec asks for server pagination here).
export async function getWithdrawHistory(
  params: WithdrawHistoryParams = {},
): Promise<WithdrawHistoryResult> {
  const pageSize = params.pageSize ?? HISTORY_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const search = params.search?.trim();

  const createdAt: Prisma.DateTimeFilter = {};
  if (params.from) createdAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  if (params.to) createdAt.lte = new Date(`${params.to}T23:59:59.999Z`);

  const where: Prisma.WithdrawWhereInput = {
    ...(status ? { status } : {}),
    ...(params.from || params.to ? { createdAt } : {}),
    ...(search
      ? {
          OR: [
            { txnId: { contains: search, mode: "insensitive" } },
            { provider: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.withdraw.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.withdraw.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    rows: rows.map((row) => ({
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
      status: row.status as WithdrawStatus,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

// Always seven ordered days, filling any the table doesn't have yet.
export async function getWithdrawSchedule(): Promise<WithdrawScheduleDay[]> {
  const rows = await prisma.withdrawScheduleDay.findMany();
  const enabled = new Map(rows.map((row) => [row.day, row.enabled]));
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    enabled: enabled.get(day) ?? false,
  }));
}

export async function getGatewayOptions(): Promise<GatewayOption[]> {
  return prisma.paymentGateway.findMany({
    select: { id: true, slug: true, name: true, logo: true },
    orderBy: { name: "asc" },
  });
}

export async function getCurrencyOptions(): Promise<CurrencyOption[]> {
  return prisma.currency.findMany({
    select: { id: true, code: true, name: true, symbol: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
}
