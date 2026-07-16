import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// A short-lived, HMAC-signed authorization session for the multi-step transfer flow. After the
// PIN passes, the (validated) transfer payload + the ordered remaining steps + which are
// cleared ride in an httpOnly cookie. The signature makes the "cleared" state unforgeable, so a
// user can never reach /send/verify/tax before /imf is actually verified.

export const TRANSFER_AUTH_COOKIE = "transfer_auth";
const TTL_MS = 15 * 60 * 1000; // whole flow must finish within 15 minutes

export type TransferStep = "imf" | "tax" | "cot" | "otp";

export type TransferAuthPayload = {
  type: "internal" | "domestic" | "wire";
  currency: string;
  amount: string; // major units, validated
  description?: string;
  recipientUserId?: string;
  recipientName?: string;
  recipientDetails?: Record<string, string>;
  recipientLabel: string; // for the debit memo
};

export type TransferAuthState = {
  payload: TransferAuthPayload;
  sequence: TransferStep[]; // steps AFTER the PIN, in order
  verified: TransferStep[]; // cleared so far (a prefix of sequence)
  otpHash?: string; // HMAC of the emailed OTP
  expiresAt: number;
};

function sign(data: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(data).digest("hex");
}

export function hashOtp(code: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(`otp:${code}`).digest("hex");
}

export function encodeTransferAuth(state: TransferAuthState): string {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeTransferAuth(token: string | undefined | null): TransferAuthState | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const state = JSON.parse(Buffer.from(body, "base64url").toString()) as TransferAuthState;
    if (!state.expiresAt || state.expiresAt < Date.now()) return null;
    return state;
  } catch {
    return null;
  }
}

// The first step not yet cleared, or null when the whole sequence is done.
export function nextStep(state: TransferAuthState): TransferStep | null {
  return state.sequence.find((step) => !state.verified.includes(step)) ?? null;
}

export function newExpiry(): number {
  return Date.now() + TTL_MS;
}
