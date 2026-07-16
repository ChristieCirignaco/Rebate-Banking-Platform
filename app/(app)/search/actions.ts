"use server";

import { requireActiveUser } from "@/lib/auth-guards";
import { searchUserTransactions, type TransactionSearchResult } from "@/lib/user-search";

// Header transaction search. The only argument is the query string — the userId comes from the
// SESSION and is never accepted from the client, so this action can only ever read the caller's
// own ledger. requireActiveUser applies the SAME full gate the app pages do (session -> not
// admin-tier -> active status -> account_status control -> login-OTP cleared), so a suspended
// or pre-OTP session can't search by replaying the action directly.
export async function searchTransactions(q: string): Promise<TransactionSearchResult[]> {
  const { session } = await requireActiveUser();
  return searchUserTransactions(session.user.id, q);
}
