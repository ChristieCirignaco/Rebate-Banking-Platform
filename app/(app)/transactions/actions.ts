"use server";

import { getSession } from "@/lib/auth-guards";
import { getTransactionDetail, type TransactionDetail } from "@/lib/transaction-detail";

// Fetch one transaction's full detail for the details modal. Scoped to the signed-in user, so a
// user can only ever open their own transactions (the resolver also filters by userId).
export async function loadTransactionDetail(id: string): Promise<TransactionDetail | null> {
  const session = await getSession();
  if (!session) return null;
  return getTransactionDetail(session.user.id, id);
}
