import { cache } from "react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import {
  SETTINGS_DEFAULTS,
  SETTINGS_SECRET_FIELDS,
  type SettingsGroupKey,
  type SettingsGroups,
} from "./defs";

// Per-request memoized raw read of a group's stored JSON (missing → {}).
const readRaw = cache(
  async (group: SettingsGroupKey): Promise<Record<string, unknown>> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: group } });
    return (row?.value as Record<string, unknown> | undefined) ?? {};
  },
);

function safeDecrypt(payload: string): string {
  try {
    return decryptSecret(payload);
  } catch {
    // Rotated key or corrupt blob → degrade to empty rather than throwing.
    return "";
  }
}

// Server-side typed read: defaults merged with stored values, secret fields DECRYPTED to
// plaintext (for server use — e.g. calling the IPinfo API). Never pass this to the client.
export async function getSettings<K extends SettingsGroupKey>(
  group: K,
): Promise<SettingsGroups[K]> {
  const raw = await readRaw(group);
  const merged = { ...SETTINGS_DEFAULTS[group], ...(raw as object) } as SettingsGroups[K];
  const writable = merged as unknown as Record<string, unknown>;
  for (const field of SETTINGS_SECRET_FIELDS[group] ?? []) {
    const enc = (raw as Record<string, unknown>)[field];
    writable[field] = typeof enc === "string" && enc ? safeDecrypt(enc) : "";
  }
  return merged;
}

// Client-safe read: secret fields are blanked and replaced by a boolean "is set" flag, so
// the form can show "•••• set" without ever receiving the secret.
export async function getClientSettings<K extends SettingsGroupKey>(
  group: K,
): Promise<{ values: SettingsGroups[K]; secretsSet: Record<string, boolean> }> {
  const raw = await readRaw(group);
  const values = { ...SETTINGS_DEFAULTS[group], ...(raw as object) } as SettingsGroups[K];
  const writable = values as unknown as Record<string, unknown>;
  const secretsSet: Record<string, boolean> = {};
  for (const field of SETTINGS_SECRET_FIELDS[group] ?? []) {
    const enc = (raw as Record<string, unknown>)[field];
    secretsSet[field] = typeof enc === "string" && enc.length > 0;
    writable[field] = "";
  }
  return { values, secretsSet };
}

// Merge a patch into a group and persist. Secret fields are encrypted; a blank secret in
// the patch keeps the existing value (matches the payment-gateway credential behavior).
export async function saveSettings<K extends SettingsGroupKey>(
  group: K,
  patch: Partial<SettingsGroups[K]>,
  adminId: string,
): Promise<void> {
  const row = await prisma.siteSetting.findUnique({ where: { key: group } });
  const existing = (row?.value as Record<string, unknown> | undefined) ?? {};
  const secretFields = new Set(SETTINGS_SECRET_FIELDS[group] ?? []);
  const next: Record<string, unknown> = { ...existing };

  for (const [key, value] of Object.entries(patch)) {
    if (secretFields.has(key)) {
      if (typeof value === "string" && value.trim()) next[key] = encryptSecret(value);
      // blank → leave the existing encrypted value untouched
    } else {
      next[key] = value;
    }
  }

  await prisma.siteSetting.upsert({
    where: { key: group },
    create: { key: group, value: next as Prisma.InputJsonValue, updatedBy: adminId },
    update: { value: next as Prisma.InputJsonValue, updatedBy: adminId },
  });
}
