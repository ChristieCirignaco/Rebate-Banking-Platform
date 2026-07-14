"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
import { formatCurrency } from "@/lib/format";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "./date-range-filter";
import { DepositReviewDialog } from "./deposit-review-dialog";
import { StackedTime, UserTxnCell } from "./shared";
import type { DepositRequest } from "./types";

export function ManualRequestsTab({ requests }: { requests: DepositRequest[] }) {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (!inRange(request.createdAt, range)) return false;
      if (!query) return true;
      return (
        request.user.name.toLowerCase().includes(query) ||
        request.txnId.toLowerCase().includes(query) ||
        request.methodName.toLowerCase().includes(query)
      );
    });
  }, [requests, search, range]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <DateRangeFilter value={range} onChange={setRange} />
        <div className="relative xl:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user, txn ID or method"
            aria-label="Search manual requests"
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
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No pending manual deposit requests.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <UserTxnCell user={request.user} txnId={request.txnId} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(request.amount, request.currency)}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        Fee: {formatCurrency(request.fee, request.currency)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{request.description ?? "Manual deposit"}</span>
                      <span className="text-muted-foreground text-xs">
                        {request.provider ?? request.methodName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StackedTime iso={request.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <DepositReviewDialog request={request} />
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
