import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// A short unforgeable proof that a specific user uploaded a specific KYC document key. The user
// upload route mints one; submitKyc requires a valid token for every file value before storing it,
// so a client can never submit a storage key it did not upload (which would otherwise let it
// inject another user's identity document into its own submission and read it back through the
// owner branch of /api/kyc-documents/[key]). Mirrors lib/tickets/attachment-token.ts; the distinct
// `kyc-document:` prefix keeps a ticket token from being replayed as a KYC token.
export function signKycDocument(key: string, userId: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`kyc-document:${key}:${userId}`)
    .digest("hex");
}

export function verifyKycDocument(key: string, userId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signKycDocument(key, userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
