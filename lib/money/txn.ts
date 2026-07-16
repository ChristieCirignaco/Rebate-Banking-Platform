import { randomUUID } from "node:crypto";

import { z } from "zod";

// Shared validators/helpers for user-entered money amounts and transaction references. Server
// only (node:crypto). Every money action used to define these identically inline.

// A user-entered amount in MAJOR units: positive, finite, and bounded.
export const AmountSchema = z.coerce
  .number({ message: "Enter a valid amount." })
  .positive("Amount must be greater than 0.")
  .max(1_000_000_000, "Amount is too large.");

// Human-readable transaction reference, e.g. txnCode("DEP") -> "DEP-1A2B3C4D".
export function txnCode(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
