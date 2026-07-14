"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Headset, Search } from "lucide-react";

import {
  DateRangeFilter,
  EMPTY_RANGE,
  type DateRange,
} from "@/components/admin/deposits/date-range-filter";
import { StackedTime } from "@/components/admin/deposits/shared";
import { listTickets } from "@/app/admin/support-ticket/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { cn, initials } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { TicketPagination } from "./ticket-pagination";
import { TicketPriorityBadge, TicketStatusBadge } from "./ticket-badges";
import type { TicketListResult, TicketStatus } from "./types";

const STATUS_OPTIONS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

// Shared list for all four routed-tab pages. `fixedStatuses` scopes the query to that
// tab's set (e.g. ["open","replied"] for "In Progress"); omit it for "All Ticket", which
// also gets its own status selector since it isn't otherwise constrained.
export function TicketsView({
  initial,
  fixedStatuses,
  showStatusFilter,
  emptyMessage,
}: {
  initial: TicketListResult;
  fixedStatuses?: TicketStatus[];
  showStatusFilter?: boolean;
  emptyMessage: string;
}) {
  const [data, setData] = useState(initial);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftRange, setDraftRange] = useState<DateRange>(EMPTY_RANGE);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRange, setAppliedRange] = useState<DateRange>(EMPTY_RANGE);
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  function fetchPage(
    page: number,
    over?: { status?: TicketStatus | "all"; search?: string; range?: DateRange },
  ) {
    const statusValue = over?.status ?? status;
    const searchValue = over?.search ?? appliedSearch;
    const rangeValue = over?.range ?? appliedRange;
    const statuses =
      fixedStatuses ?? (statusValue !== "all" ? [statusValue] : undefined);
    const id = ++requestId.current;
    startTransition(async () => {
      try {
        const result = await listTickets({
          statuses,
          page,
          search: searchValue,
          from: rangeValue.from || undefined,
          to: rangeValue.to || undefined,
        });
        if (id === requestId.current) setData(result);
      } catch {
        if (id === requestId.current) toast.error("Could not load tickets. Please try again.");
      }
    });
  }

  function applyFilters() {
    setAppliedSearch(draftSearch);
    setAppliedRange(draftRange);
    fetchPage(1, { search: draftSearch, range: draftRange });
  }

  function onStatus(value: TicketStatus | "all") {
    setStatus(value);
    fetchPage(1, { status: value });
  }

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.total, data.page * data.pageSize);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangeFilter value={draftRange} onChange={setDraftRange} />
          {showStatusFilter ? (
            <Select value={status} onValueChange={(value) => onStatus(value as TicketStatus | "all")}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Ticket status">
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
          ) : null}
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
              placeholder="Search subject, ticket ID or user"
              aria-label="Search tickets"
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
              <TableHead>Title / User</TableHead>
              <TableHead>Ticket ID / Priority</TableHead>
              <TableHead>Opening Time</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {ticket.user.avatarUrl ? (
                          <AvatarImage src={ticket.user.avatarUrl} alt={ticket.user.name} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {initials(ticket.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <span className="max-w-56 truncate font-medium">{ticket.subject}</span>
                        <span className="text-muted-foreground text-xs">{ticket.user.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs">#{ticket.ticketCode}</span>
                      <TicketPriorityBadge priority={ticket.priority} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <StackedTime iso={ticket.createdAt} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{ticket.categoryName ?? "Uncategorized"}</span>
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button asChild size="sm">
                        <Link href={`/admin/support-ticket/show/${ticket.id}`}>
                          <Headset className="size-4" />
                          Support Now
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data.total > 0 ? (
        <p className={cn("text-muted-foreground text-sm", isPending && "opacity-60")}>
          {`Showing ${from}–${to} of ${data.total} ticket${data.total === 1 ? "" : "s"}`}
        </p>
      ) : null}

      <TicketPagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isPending}
        onPageChange={(page) => fetchPage(page)}
      />
    </div>
  );
}
