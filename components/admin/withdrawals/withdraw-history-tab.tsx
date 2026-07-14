"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Trash2 } from "lucide-react";

import {
  DateRangeFilter,
  EMPTY_RANGE,
  type DateRange,
} from "@/components/admin/deposits/date-range-filter";
import { StackedTime, UserTxnCell } from "@/components/admin/deposits/shared";
import { listWithdrawHistory } from "@/app/admin/withdrawals/actions";
import type { WithdrawHistoryResult } from "@/lib/admin/withdrawals";
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
import { formatCurrency } from "@/lib/format";
import { DeleteWithdrawDialog } from "./delete-withdraw-dialog";
import { WithdrawStatusBadge } from "./withdraw-badges";
import { WithdrawPagination } from "./withdraw-pagination";
import type { WithdrawStatus } from "./types";

const STATUS_OPTIONS: { value: WithdrawStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "failed", label: "Failed" },
];

export function WithdrawHistoryTab({ initial }: { initial: WithdrawHistoryResult }) {
  const [data, setData] = useState(initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WithdrawStatus | "all">("all");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Server-driven paging + filtering: fetch each page from the action, keeping tab
  // switching client-side.
  function fetchPage(
    page: number,
    statusValue: WithdrawStatus | "all",
    searchValue: string,
    rangeValue: DateRange,
  ) {
    startTransition(async () => {
      const result = await listWithdrawHistory({
        page,
        status: statusValue,
        search: searchValue,
        from: rangeValue.from || undefined,
        to: rangeValue.to || undefined,
      });
      setData(result);
    });
  }

  function onStatus(value: WithdrawStatus | "all") {
    setStatus(value);
    fetchPage(1, value, search, range);
  }
  function onRange(value: DateRange) {
    setRange(value);
    fetchPage(1, status, search, value);
  }
  function onSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPage(1, status, value, range), 400);
  }

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.total, data.page * data.pageSize);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangeFilter value={range} onChange={onRange} />
          <Select value={status} onValueChange={(value) => onStatus(value as WithdrawStatus | "all")}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Withdraw status">
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
        <div className="relative xl:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search user, txn ID or provider"
            aria-label="Search withdraw history"
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table aria-busy={isPending} className={cn(isPending && "opacity-60")}>
          <TableHeader>
            <TableRow>
              <TableHead>User / Txn ID</TableHead>
              <TableHead>Amount / Fee</TableHead>
              <TableHead>Description / Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No withdrawals match your filters.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((withdraw) => (
                <TableRow key={withdraw.id}>
                  <TableCell>
                    <UserTxnCell user={withdraw.user} txnId={withdraw.txnId} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium tabular-nums text-rose-600 dark:text-rose-400">
                        -{formatCurrency(withdraw.amount, withdraw.currency)}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        Fee: {formatCurrency(withdraw.fee, withdraw.currency)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{withdraw.description ?? "Withdrawal"}</span>
                      <span className="text-muted-foreground text-xs">
                        {withdraw.provider ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <WithdrawStatusBadge status={withdraw.status} />
                  </TableCell>
                  <TableCell>
                    <StackedTime iso={withdraw.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <DeleteWithdrawDialog
                        id={withdraw.id}
                        txnId={withdraw.txnId}
                        onDeleted={() => fetchPage(data.page, status, search, range)}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                          title="Delete transaction"
                          aria-label={`Delete ${withdraw.txnId}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </DeleteWithdrawDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data.total > 0 ? (
        <p className="text-muted-foreground text-sm">
          {`Showing ${from}–${to} of ${data.total} withdrawals`}
        </p>
      ) : null}

      <WithdrawPagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isPending}
        onPageChange={(page) => fetchPage(page, status, search, range)}
      />
    </div>
  );
}
