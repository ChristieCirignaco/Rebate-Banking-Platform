"use client";

import { ClipboardList, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { RequestReviewDialog } from "./request-review-dialog";
import type { MoneyRequestHistory, MoneyRequestReview, MoneyRequestStatus } from "./types";

const STATUS_VARIANT: Record<MoneyRequestStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function StatusBadge({ status }: { status: MoneyRequestStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status}
    </Badge>
  );
}

function UserCell({ name, email, txnId }: { name: string; email: string; txnId: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{name}</span>
      <span className="text-muted-foreground text-xs">{email}</span>
      <span className="text-muted-foreground font-mono text-xs">{txnId}</span>
    </div>
  );
}

export function RequestsView({
  pending,
  history,
}: {
  pending: MoneyRequestReview[];
  history: MoneyRequestHistory[];
}) {
  return (
    <Tabs defaultValue="pending" className="gap-4">
      <div className="-mb-2 w-full overflow-x-auto pb-2">
        <TabsList className="w-max justify-start">
          <TabsTrigger value="pending">
            <ClipboardList className="size-4" />
            Pending Requests
            {pending.length > 0 ? (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {pending.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="size-4" />
            History
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pending">
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Txn ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    No pending money requests.
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <UserCell
                        name={request.userName}
                        email={request.userEmail}
                        txnId={request.txnId}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {formatCurrency(request.amount, request.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[16rem] text-sm break-words">
                      {request.reason?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateTime(request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <RequestReviewDialog request={request} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Txn ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewed by</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No money requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <UserCell
                        name={request.userName}
                        email={request.userEmail}
                        txnId={request.txnId}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {formatCurrency(request.amount, request.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[14rem] text-sm break-words">
                      {request.reason?.trim() || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {request.reviewedByName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateTime(request.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
