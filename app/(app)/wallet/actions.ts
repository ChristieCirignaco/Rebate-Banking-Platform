"use server";

import { revalidatePath } from "next/cache";

import { requireActiveUser } from "@/lib/auth-guards";
import { addWalletFor, type WalletMutationResult } from "@/lib/wallets";

// A user adds their own extra wallets: the primary is created at signup and they may add up to
// two more. The cap and the currency check live in lib/wallets so the admin's assign action on
// the user-detail page can't drift from this one.
//
// The user is derived from the session — never from an argument — so one user can never add a
// wallet to another account. Removing is deliberately admin-only (the delete guards live in
// lib/wallets); a user's wallet can only be dropped while empty and history-free.
export async function addWallet(currencyCode: string): Promise<WalletMutationResult> {
  const { session } = await requireActiveUser();
  const result = await addWalletFor(session.user.id, currencyCode);
  if (result.ok) revalidatePath("/wallet");
  return result;
}
