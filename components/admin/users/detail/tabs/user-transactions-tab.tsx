"use client";

import { useState } from "react";
import { Inbox, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DateRangeSelect, EmptyState } from "../shared";
import type { DetailTransaction, DetailTxnStatus } from "../types";

const STATUS: Record<DetailTxnStatus, { label: string; className: string }> = {
  completed: {
    label: "COMPLETED",
    className:
      "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  pending: {
    label: "PENDING",
    className:
      "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  failed: {
    label: "FAILED",
    className:
      "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

export function UserTransactionsTab({
  transactions,
}: {
  transactions: DetailTransaction[];
}) {
  const [range, setRange] = useState("30d");
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((transaction) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [transaction.description, transaction.id, transaction.provider].some(
      (value) => value.toLowerCase().includes(query),
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DateRangeSelect value={range} onChange={setRange} />
        <div className="flex gap-2 sm:w-72">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions…"
            aria-label="Search transactions"
          />
          <Button size="icon" variant="secondary" aria-label="Search">
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Data found"
            description="This user has no transactions in the selected range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description / Provider</TableHead>
                <TableHead>TRX Info</TableHead>
                <TableHead>Amount / Type</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((transaction) => {
                const status = STATUS[transaction.status];
                const positive = transaction.amount >= 0;
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {transaction.description}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {transaction.provider}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {transaction.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {positive ? "+" : "−"}
                          {formatCurrency(
                            Math.abs(transaction.amount),
                            transaction.currency,
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs capitalize">
                          {transaction.type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(transaction.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
