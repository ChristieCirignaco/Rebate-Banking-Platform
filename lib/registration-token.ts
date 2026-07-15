import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// A short-lived, HMAC-signed "continuation" token that carries a just-registered (session-less)
// user through the optional product-upload step. It is stored in an httpOnly cookie the moment
// the account is created and consumed when the user submits or skips products, so the product
// submissions bind to the correct pending user without granting a real session.

export const REGISTRATION_COOKIE = "reg_continuation";
const TTL_MS = 60 * 60 * 1000; // 1 hour to finish the product step

function sign(payload: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("hex");
}

export function signRegistrationToken(userId: string): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the userId if the token is well-formed, unexpired, and its signature verifies;
// otherwise null. Constant-time signature comparison.
export function verifyRegistrationToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, sig] = parts;
  if (!userId || !expiresAtStr || !sig) return null;

  const expected = sign(`${userId}.${expiresAtStr}`);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return userId;
}
