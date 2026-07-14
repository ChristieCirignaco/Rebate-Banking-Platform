"use client";

import { useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

import {
  DateRangeFilter,
  EMPTY_RANGE,
  type DateRange,
} from "@/components/admin/deposits/date-range-filter";
import { StackedTime, UserTxnCell } from "@/components/admin/deposits/shared";
import { listTransactions } from "@/app/admin/transaction/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";
import { sourceLabel, TransactionStatusBadge } from "./transaction-badges";
import { TransactionViewDialog } from "./transaction-view-dialog";
import { TransactionsPagination } from "./transactions-pagination";
import {
  TRANSACTION_SOURCES,
  type TransactionsResult,
  type TransactionSource,
  type TransactionStatus,
} from "./types";

const STATUS_OPTIONS: { value: TransactionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const SOURCE_OPTIONS: { value: TransactionSource | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  ...TRANSACTION_SOURCES.map((source) => ({ value: source, label: sourceLabel(source) })),
];

// Site-wide ledger, server-paginated. Date-range + search commit on the Search button;
// type/status filters apply immediately. A request token drops out-of-order responses.
export function TransactionsView({ initial }: { initial: TransactionsResult }) {
  const [data, setData] = useState(initial);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftRange, setDraftRange] = useState<DateRange>(EMPTY_RANGE);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRange, setAppliedRange] = useState<DateRange>(EMPTY_RANGE);
  const [source, setSource] = useState<TransactionSource | "all">("all");
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  function fetchPage(
    page: number,
    over?: {
      source?: TransactionSource | "all";
      status?: TransactionStatus | "all";
      search?: string;
      range?: DateRange;
    },
    revert?: () => void,
  ) {
    const sourceValue = over?.source ?? source;
    const statusValue = over?.status ?? status;
    const searchValue = over?.search ?? appliedSearch;
    const rangeValue = over?.range ?? appliedRange;
    const id = ++requestId.current;
    startTransition(async () => {
      try {
        const result = await listTransactions({
          page,
          source: sourceValue,
          status: statusValue,
          search: searchValue,
          from: rangeValue.from || undefined,
          to: rangeValue.to || undefined,
        });
        if (id === requestId.current) setData(result);
      } catch {
        if (id === requestId.current) {
          toast.error("Could not load transactions. Please try again.");
          // Keep the visible filter controls in sync with the still-displayed data.
          revert?.();
        }
      }
    });
  }

  function applyFilters() {
    setAppliedSearch(draftSearch);
    setAppliedRange(draftRange);
    fetchPage(1, { search: draftSearch, range: draftRange });
  }

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.total, data.page * data.pageSize);
  const hasFilters =
    source !== "all" ||
    status !== "all" ||
    appliedSearch !== "" ||
    Boolean(appliedRange.from) ||
    Boolean(appliedRange.to);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <DateRangeFilter value={draftRange} onChange={setDraftRange} />
          <Select
            value={source}
            onValueChange={(value) => {
              const prev = source;
              const next = value as TransactionSource | "all";
              setSource(next);
              fetchPage(1, { source: next }, () => setSource(prev));
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Transaction type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              const prev = status;
              const next = value as TransactionStatus | "all";
              setStatus(next);
              fetchPage(1, { status: next }, () => setStatus(prev));
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Transaction status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 xl:w-72">
            <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4" />
            <Input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="Search user, ID or provider"
              aria-label="Search transactions"
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={applyFilters} disabled={isPending}>
            <Search className="size-4" />
            Search
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table aria-busy={isPending} className={cn(isPending && "opacity-60")}>
          <TableHeader>
            <TableRow>
              <TableHead>User / Txn</TableHead>
              <TableHead>Amount / Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {hasFilters
                    ? "No transactions match your filters."
                    : "No transactions yet."}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((transaction) => {
                const positive = transaction.direction === "credit";
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <UserTxnCell
                        user={transaction.user}
                        txnId={`#${transaction.id.slice(0, 8)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {positive ? "+" : "−"}
                          {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {sourceLabel(transaction.source)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {transaction.description ?? sourceLabel(transaction.source)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {transaction.provider ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell>
                      <StackedTime iso={transaction.createdAt} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <TransactionViewDialog transaction={transaction} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {data.total > 0 ? (
        <p className={cn("text-muted-foreground text-sm", isPending && "opacity-60")}>
          {`Showing ${from}–${to} of ${data.total} transaction${data.total === 1 ? "" : "s"}`}
        </p>
      ) : null}

      <TransactionsPagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isPending}
        onPageChange={(page) => fetchPage(page)}
      />
    </div>
  );
}
