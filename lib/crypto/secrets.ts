import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

import { env } from "@/lib/env";

// AES-256-GCM for credential values at rest. Keyed on PAYMENT_CREDENTIALS_KEY when set
// (so payment secrets can be rotated independently of the auth secret), else derived from
// BETTER_AUTH_SECRET. Payload format: base64( iv[12] || authTag[16] || ciphertext ).
const KEY = scryptSync(
  env.PAYMENT_CREDENTIALS_KEY ?? env.BETTER_AUTH_SECRET,
  "payment-gateway-credentials-v1",
  32,
);
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function encryptJson(value: unknown): string {
  return encryptSecret(JSON.stringify(value));
}

// Returns null on missing input or any decrypt/parse failure (e.g. a rotated key) so a
// bad blob degrades to "no credentials" instead of throwing.
export function decryptJson<T>(payload: string | null | undefined): T | null {
  if (!payload) return null;
  try {
    return JSON.parse(decryptSecret(payload)) as T;
  } catch {
    return null;
  }
}
