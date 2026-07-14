"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import {
  CURRENCY_ROLES,
  type CurrencyFormPayload,
  type CurrencyRolePayload,
} from "@/components/admin/currencies/types";

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const ROLE_KEYS = CURRENCY_ROLES.map((role) => role.key);
const CURRENCY_TYPES = ["fiat", "crypto"];
const FEE_TYPES = ["percent", "fixed"];

const nonNeg = (value: number) =>
  Number.isFinite(value) && value >= 0 ? value : 0;

function validate(payload: CurrencyFormPayload): string | null {
  const code = payload.code?.trim().toUpperCase();
  if (!code || code.length < 2 || code.length > 12) {
    return "Code must be 2–12 characters.";
  }
  if (!/^[A-Z0-9]+$/.test(code)) return "Code may only contain letters and digits.";
  if (!payload.name?.trim()) return "Currency name is required.";
  if (!payload.symbol?.trim()) return "Symbol is required.";
  if (!CURRENCY_TYPES.includes(payload.type)) return "Invalid currency type.";
  if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
    return "Conversion rate must be greater than zero.";
  }
  if (payload.flagUrl != null) {
    if (typeof payload.flagUrl !== "string" || payload.flagUrl.length > 512 * 1024) {
      return "Flag image is too large.";
    }
    const isDataImage = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(
      payload.flagUrl,
    );
    const isHttpUrl = /^https?:\/\//.test(payload.flagUrl);
    if (!isDataImage && !isHttpUrl) {
      return "Flag must be an uploaded image or image URL.";
    }
  }
  return null;
}

function conflictError(cause: unknown, fallback: string): string {
  if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
    return "That change conflicts with an existing currency (code or default). Please retry.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

// Always persist exactly the four roles, filling gaps and sanitizing numbers.
function normalizeRoles(roles: CurrencyRolePayload[] = []) {
  return ROLE_KEYS.map((key) => {
    const match = roles.find((role) => role.role === key);
    return {
      role: key,
      feeType: match && FEE_TYPES.includes(match.feeType) ? match.feeType : "percent",
      feeValue: nonNeg(match?.feeValue ?? 0),
      minAmount: nonNeg(match?.minAmount ?? 0),
      maxAmount: nonNeg(match?.maxAmount ?? 0),
      enabled: match?.enabled ?? true,
    };
  });
}

export async function createCurrency(
  payload: CurrencyFormPayload,
): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminSession())) return { ok: false, error: "Not authorized." };
  const error = validate(payload);
  if (error) return { ok: false, error };

  const code = payload.code.trim().toUpperCase();
  const existing = await prisma.currency.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existing) return { ok: false, error: `Currency ${code} already exists.` };

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Only one default currency at a time.
      if (payload.isDefault) {
        await tx.currency.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.currency.create({
        data: {
          code,
          name: payload.name.trim(),
          symbol: payload.symbol.trim(),
          type: payload.type,
          flagUrl: payload.flagUrl || null,
          rate: payload.rate,
          autoWallet: payload.autoWallet,
          isDefault: payload.isDefault,
          isActive: payload.isActive,
          roles: { create: normalizeRoles(payload.roles) },
        },
        select: { id: true },
      });
    });
    revalidatePath("/admin/currencies");
    return { ok: true, id: created.id };
  } catch (cause) {
    return { ok: false, error: conflictError(cause, "Failed to create currency.") };
  }
}

export async function updateCurrency(
  id: string,
  payload: CurrencyFormPayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return { ok: false, error: "Not authorized." };
  const error = validate(payload);
  if (error) return { ok: false, error };

  const existing = await prisma.currency.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Currency not found." };

  const code = payload.code.trim().toUpperCase();
  const duplicate = await prisma.currency.findFirst({
    where: { code, NOT: { id } },
    select: { id: true },
  });
  if (duplicate) return { ok: false, error: `Currency ${code} already exists.` };

  try {
    await prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.currency.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      await tx.currency.update({
        where: { id },
        data: {
          code,
          name: payload.name.trim(),
          symbol: payload.symbol.trim(),
          type: payload.type,
          flagUrl: payload.flagUrl || null,
          rate: payload.rate,
          autoWallet: payload.autoWallet,
          isDefault: payload.isDefault,
          isActive: payload.isActive,
        },
      });
      for (const role of normalizeRoles(payload.roles)) {
        await tx.currencyRole.upsert({
          where: { currencyId_role: { currencyId: id, role: role.role } },
          update: {
            feeType: role.feeType,
            feeValue: role.feeValue,
            minAmount: role.minAmount,
            maxAmount: role.maxAmount,
            enabled: role.enabled,
          },
          create: { currencyId: id, ...role },
        });
      }
    });
    revalidatePath("/admin/currencies");
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: conflictError(cause, "Failed to update currency.") };
  }
}

export async function deleteCurrency(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return { ok: false, error: "Not authorized." };
  const existing = await prisma.currency.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Currency not found." };

  // The default (e.g. USD) IS deletable in our system. Cascade removes its role config;
  // user wallets keep their string code (no hard FK), they just lose central config.
  await prisma.currency.delete({ where: { id } });
  revalidatePath("/admin/currencies");
  return { ok: true };
}

export async function toggleCurrencyStatus(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return { ok: false, error: "Not authorized." };
  const existing = await prisma.currency.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Currency not found." };

  await prisma.currency.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/currencies");
  return { ok: true };
}
