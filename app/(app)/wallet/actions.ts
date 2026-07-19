"use server";

import { revalidatePath } from "next/cache";

import { requireActiveUser } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import {
  addWalletFor,
  removeWalletFor,
  setDefaultWalletFor,
  type WalletMutationResult,
} from "@/lib/wallets";

// A user's own wallet mutations. Every one derives the user from the session — never from an
// argument — so no caller can reach another account's wallets, and every rule (the cap, the
// currency check, the delete guards) lives in lib/wallets so the admin's equivalents on the
// user-detail page can't drift from these.

// The primary is created at signup; a user may add up to two more.
// Every mutation here re-checks `wallets`. /wallet already redirects when the flag is off, but
// that only stops the page render — these are server actions, callable directly, so the route
// guard is presentation and this is the authority.
async function walletsOff(): Promise<WalletMutationResult | null> {
  return (await isFeatureEnabled("wallets"))
    ? null
    : { ok: false, error: "Wallets are currently unavailable." };
}

export async function addWallet(currencyCode: string): Promise<WalletMutationResult> {
  const { session } = await requireActiveUser();
  const off = await walletsOff();
  if (off) return off;
  const result = await addWalletFor(session.user.id, currencyCode);
  if (result.ok) revalidatePath("/wallet");
  return result;
}

// Remove one of your own wallets. removeWalletFor refuses the primary, the last remaining
// wallet, anything holding a balance, and anything with ledger history — so this can only ever
// drop a wallet that was added and never used. It was admin-only until now for no reason beyond
// there being no user-facing surface to call it from.
export async function removeWallet(walletId: string): Promise<WalletMutationResult> {
  const { session } = await requireActiveUser();
  const off = await walletsOff();
  if (off) return off;
  const result = await removeWalletFor(session.user.id, walletId);
  if (result.ok) revalidatePath("/wallet");
  return result;
}

// Make one of your wallets primary. Also moves user.currency — see setDefaultWalletFor for why
// the two must not be changed independently.
export async function setDefaultWallet(walletId: string): Promise<WalletMutationResult> {
  const { session } = await requireActiveUser();
  const off = await walletsOff();
  if (off) return off;
  const result = await setDefaultWalletFor(session.user.id, walletId);
  if (result.ok) {
    // The primary currency reaches further than this page: the dashboard shows the primary
    // balance, and send/products read user.currency.
    revalidatePath("/wallet");
    revalidatePath("/dashboard");
  }
  return result;
}
