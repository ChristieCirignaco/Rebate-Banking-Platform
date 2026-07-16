"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminVoucherRow, AdminVoucherStatus } from "./types";

const STATUS_VARIANT: Record<AdminVoucherStatus, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  redeemed: "default",
  expired: "outline",
  canceled: "destructive",
};

export function VouchersView({ vouchers }: { vouchers: AdminVoucherRow[] }) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code / Creator</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Redeemed</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vouchers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                No vouchers yet.
              </TableCell>
            </TableRow>
          ) : (
            vouchers.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-medium">{v.code}</span>
                    <span className="text-muted-foreground text-xs">{v.creatorName}</span>
                    <span className="text-muted-foreground text-xs">{v.creatorEmail}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium tabular-nums">{v.amountLabel}</TableCell>
                <TableCell className="text-muted-foreground text-sm tabular-nums">{v.feeLabel}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[v.status]} className="capitalize">
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {v.redeemedOnLabel ? (
                    <span>
                      {v.redeemedOnLabel}
                      {v.redeemedByName ? (
                        <span className="block">by {v.redeemedByName}</span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{v.createdOnLabel}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
