import type { PaymentGateway } from "@prisma/client";

import { decryptJson, encryptJson } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  GATEWAY_CONFIGS,
  GATEWAY_SLUGS,
  isGatewaySlug,
  type GatewaySlug,
} from "@/lib/payment-gateways/config";
import type {
  GatewayStatus,
  PaymentGatewayView,
  UpdateGatewayPayload,
} from "@/components/admin/payment-gateways/types";

type Credentials = Record<string, string>;

function webhookUrl(slug: GatewaySlug): string | null {
  if (!GATEWAY_CONFIGS[slug].hasWebhook) return null;
  return `${env.BETTER_AUTH_URL.replace(/\/+$/, "")}/ipn/${slug}`;
}

// Build the safe view: non-sensitive values in the clear, sensitive fields as presence
// flags only. Rows whose slug isn't one of the four configured gateways are dropped.
function toView(row: PaymentGateway): PaymentGatewayView | null {
  if (!isGatewaySlug(row.slug)) return null;
  const config = GATEWAY_CONFIGS[row.slug];
  const credentials = decryptJson<Credentials>(row.credentials) ?? {};

  const values: Record<string, string> = {};
  const secretsSet: Record<string, boolean> = {};
  for (const field of config.fields) {
    if (field.sensitive) secretsSet[field.key] = Boolean(credentials[field.key]);
    else values[field.key] = credentials[field.key] ?? "";
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logo: row.logo ?? config.logo,
    supportedCurrencies: row.supportedCurrencies,
    withdrawAvailable: row.withdrawAvailable,
    status: row.isActive ? "active" : "inactive",
    webhookUrl: webhookUrl(row.slug),
    values,
    secretsSet,
  };
}

export async function getGateways(): Promise<PaymentGatewayView[]> {
  const rows = await prisma.paymentGateway.findMany();
  const order = (slug: GatewaySlug) => GATEWAY_SLUGS.indexOf(slug);
  return rows
    .map(toView)
    .filter((gateway): gateway is PaymentGatewayView => gateway !== null)
    .sort((a, b) => order(a.slug) - order(b.slug));
}

export async function getGateway(slug: string): Promise<PaymentGatewayView | null> {
  if (!isGatewaySlug(slug)) return null;
  const row = await prisma.paymentGateway.findUnique({ where: { slug } });
  return row ? toView(row) : null;
}

export type UpdateGatewayResult =
  | { ok: true; gateway: PaymentGatewayView }
  | { ok: false; error: string; notFound?: boolean };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Merge changes into the stored credential blob and re-encrypt. Sensitive fields are only
// overwritten when a non-empty value is supplied; unknown keys are ignored.
export async function updateGateway(
  slug: string,
  input: Partial<UpdateGatewayPayload>,
): Promise<UpdateGatewayResult> {
  if (!isGatewaySlug(slug)) return { ok: false, error: "Unknown gateway.", notFound: true };
  const config = GATEWAY_CONFIGS[slug];

  const row = await prisma.paymentGateway.findUnique({ where: { slug } });
  if (!row) return { ok: false, error: "Gateway not found.", notFound: true };

  // Distinguish "no credentials" from "stored but undecryptable" (e.g. rotated key): the
  // latter must never be silently merged-into or overwritten.
  const decrypted = decryptJson<Credentials>(row.credentials);
  const decryptFailed = row.credentials != null && decrypted === null;
  const current = decrypted ?? {};
  const next: Credentials = { ...current };
  const fieldByKey = new Map(config.fields.map((field) => [field.key, field]));

  for (const [key, rawValue] of Object.entries(input.credentials ?? {})) {
    const field = fieldByKey.get(key);
    if (!field) continue; // ignore keys not in this gateway's schema
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (field.sensitive) {
      if (value) next[key] = value; // blank = keep the existing secret
      continue;
    }
    if (field.type === "select" && value && !field.options?.some((o) => o.value === value)) {
      return { ok: false, error: `Invalid value for ${field.label}.` };
    }
    if (field.type === "email" && value && !EMAIL_RE.test(value)) {
      return { ok: false, error: `${field.label} must be a valid email address.` };
    }
    next[key] = value;
  }

  const hasAnyValue = Object.values(next).some((value) => value !== "");
  const isActive =
    input.status === undefined ? row.isActive : input.status === "active";

  // The stored secrets can't be read, so a partial save would persist a broken blob and
  // drop the (unrecoverable) fields — require a full re-entry instead.
  if (decryptFailed && hasAnyValue) {
    const missing = config.fields.filter((field) => !next[field.key]);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Stored credentials for ${config.name} could not be read (the encryption key may have changed). Re-enter all fields: ${missing.map((field) => field.label).join(", ")}.`,
      };
    }
  }

  // Don't activate a gateway that's missing its secret credentials.
  if (isActive) {
    const missing = config.fields.filter((field) => field.sensitive && !next[field.key]);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Enter the required credentials before activating ${config.name}: ${missing.map((field) => field.label).join(", ")}.`,
      };
    }
  }

  const data: { isActive: boolean; credentials?: string | null } = { isActive };
  if (hasAnyValue) {
    data.credentials = encryptJson(next);
  } else if (!decryptFailed) {
    data.credentials = null; // genuinely empty → safe to clear
  }
  // else: undecryptable blob + nothing new → leave the ciphertext untouched (recoverable).

  await prisma.paymentGateway.update({ where: { slug }, data });

  const gateway = await getGateway(slug);
  if (!gateway) return { ok: false, error: "Gateway not found.", notFound: true };
  return { ok: true, gateway };
}

// Bare status-flag toggle, keeping this file the one place that knows the gateway schema.
export async function setGatewayStatus(
  slug: string,
  status: GatewayStatus,
): Promise<UpdateGatewayResult> {
  return updateGateway(slug, { status });
}
