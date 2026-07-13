import { formatCurrency } from "@/lib/format";

// Money is stored as integer minor units (bigint), 2 decimal places. These helpers
// convert to/from major units and format for display (design spec §5).

export function toMinor(major: number): bigint {
  return BigInt(Math.round(major * 100));
}

export function toMajor(minor: bigint): number {
  return Number(minor) / 100;
}

export function formatMinor(minor: bigint, currency = "USD"): string {
  return formatCurrency(toMajor(minor), currency);
}
