import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { TransactionRow, TransactionStatus } from "./types";

// Status colours are reserved and always carry a text label (never colour alone).
const STATUS: Record<TransactionStatus, { label: string; className: string }> =
  {
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

export function LatestTransactionsTable({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Txn</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const status = STATUS[transaction.status];
              const positive = transaction.amount >= 0;
              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{transaction.user}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {transaction.id}
                      </span>
                    </div>
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
                      <Badge className={status.className}>{status.label}</Badge>
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
      </CardContent>
    </Card>
  );
}
