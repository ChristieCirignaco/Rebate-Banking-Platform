"use client";

import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminExchangeRow } from "./types";

export function ExchangesView({ exchanges }: { exchanges: AdminExchangeRow[] }) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User / Txn ID</TableHead>
            <TableHead>Conversion</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exchanges.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                No exchanges yet.
              </TableCell>
            </TableRow>
          ) : (
            exchanges.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{e.userName}</span>
                    <span className="text-muted-foreground text-xs">{e.userEmail}</span>
                    <span className="text-muted-foreground font-mono text-xs">{e.txnId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm font-medium tabular-nums">
                    <span>{e.fromLabel}</span>
                    <ArrowRight className="text-muted-foreground size-3.5" />
                    <span className="text-emerald-600">{e.toLabel}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{e.rateLabel}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{e.createdAtLabel}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
