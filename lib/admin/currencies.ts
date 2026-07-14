import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  CURRENCY_ROLES,
  type CurrencyItem,
  type CurrencyListResult,
  type CurrencyRoleConfig,
  type CurrencyRoleKey,
  type CurrencyType,
  type FeeType,
} from "@/components/admin/currencies/types";

type CurrencyWithRoles = Prisma.CurrencyGetPayload<{ include: { roles: true } }>;

const ROLE_ORDER = CURRENCY_ROLES.map((role) => role.key);

function toItem(row: CurrencyWithRoles): CurrencyItem {
  const roles: CurrencyRoleConfig[] = row.roles
    .map((role) => ({
      role: role.role as CurrencyRoleKey,
      feeType: role.feeType as FeeType,
      feeValue: Number(role.feeValue),
      minAmount: Number(role.minAmount),
      maxAmount: Number(role.maxAmount),
      enabled: role.enabled,
    }))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    type: row.type as CurrencyType,
    flagUrl: row.flagUrl ?? undefined,
    rate: Number(row.rate),
    autoWallet: row.autoWallet,
    isDefault: row.isDefault,
    isActive: row.isActive,
    roles,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCurrencies(): Promise<CurrencyListResult> {
  const rows = await prisma.currency.findMany({
    include: { roles: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
  const items = rows.map(toItem);
  const defaultCode =
    items.find((currency) => currency.isDefault)?.code ?? items[0]?.code ?? "USD";
  return { rows: items, defaultCode };
}

export async function getCurrency(id: string): Promise<CurrencyItem | null> {
  const row = await prisma.currency.findUnique({
    where: { id },
    include: { roles: true },
  });
  return row ? toItem(row) : null;
}
