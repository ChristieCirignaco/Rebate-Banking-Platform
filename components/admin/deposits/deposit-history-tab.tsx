"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";

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
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "./date-range-filter";
import { DeleteDepositDialog } from "./delete-deposit-dialog";
import { DepositStatusBadge } from "./deposit-badges";
import { DEPOSIT_STATUS_OPTIONS } from "./deposit-filter-options";
import { StackedTime, UserTxnCell } from "./shared";
import type { DepositHistory, DepositStatus } from "./types";

export function DepositHistoryTab({ history }: { history: DepositHistory[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DepositStatus | "all">("all");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((deposit) => {
      if (status !== "all" && deposit.status !== status) return false;
      if (!inRange(deposit.createdAt, range)) return false;
      if (!query) return true;
      return (
        deposit.user.name.toLowerCase().includes(query) ||
        deposit.txnId.toLowerCase().includes(query) ||
        (deposit.provider ?? "").toLowerCase().includes(query)
      );
    });
  }, [history, search, status, range]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangeFilter value={range} onChange={setRange} />
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as DepositStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Deposit status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPOSIT_STATUS_OPTIONS.map((option) => (
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user, txn ID or provider"
            aria-label="Search deposit history"
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No deposits match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell>
                    <UserTxnCell user={deposit.user} txnId={deposit.txnId} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(deposit.amount, deposit.currency)}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        Fee: {formatCurrency(deposit.fee, deposit.currency)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{deposit.description ?? "Deposit"}</span>
                      <span className="text-muted-foreground text-xs">
                        {deposit.provider ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DepositStatusBadge status={deposit.status} />
                  </TableCell>
                  <TableCell>
                    <StackedTime iso={deposit.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <DeleteDepositDialog id={deposit.id} txnId={deposit.txnId}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                          title="Delete transaction"
                          aria-label={`Delete ${deposit.txnId}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </DeleteDepositDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
