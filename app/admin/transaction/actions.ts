"use server";

import { getAdminSession } from "@/lib/auth-guards";
import { getTransactions, TRANSACTIONS_PAGE_SIZE } from "@/lib/admin/transactions";
import type {
  TransactionsParams,
  TransactionsResult,
} from "@/components/admin/transactions/types";

const EMPTY: TransactionsResult = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: TRANSACTIONS_PAGE_SIZE,
  totalPages: 1,
};

// Read action powering client-side pagination + filtering on the transactions page.
export async function listTransactions(
  params: TransactionsParams,
): Promise<TransactionsResult> {
  if (!(await getAdminSession())) return EMPTY;
  return getTransactions(params);
}
