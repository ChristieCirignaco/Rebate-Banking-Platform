import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// A short unforgeable proof that a specific user uploaded a specific attachment key. The user
// upload route mints one; createTicket/sendTicketMessage require a valid token before storing an
// attachment, so a client can never attach a storage key it did not upload (which would otherwise
// let it inject another user's attachment key into its own thread and read it back).
export function signAttachment(key: string, userId: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`ticket-attachment:${key}:${userId}`)
    .digest("hex");
}

export function verifyAttachment(key: string, userId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signAttachment(key, userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
