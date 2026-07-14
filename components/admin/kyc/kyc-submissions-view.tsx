"use client";

import { useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

import {
  DateRangeFilter,
  EMPTY_RANGE,
  type DateRange,
} from "@/components/admin/deposits/date-range-filter";
import { StackedTime, initials } from "@/components/admin/deposits/shared";
import { listKycSubmissions } from "@/app/admin/kyc/actions";
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
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { ApplicableToBadge, KycStatusBadge } from "./kyc-badges";
import { KycPagination } from "./kyc-pagination";
import { KycReviewDialog } from "./kyc-review-dialog";
import { KycViewDialog } from "./kyc-view-dialog";
import type { KycSubmissionsResult, KycSubmissionStatus } from "./types";

const STATUS_OPTIONS: { value: KycSubmissionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// Shared list for the Awaiting queue (mode "pending", fixed status) and the full Kyc List
// (mode "all", with a status filter). Server-driven paging via listKycSubmissions; filters
// commit on the Search button (a request token drops out-of-order responses).
export function KycSubmissionsView({
  initial,
  mode,
}: {
  initial: KycSubmissionsResult;
  mode: "pending" | "all";
}) {
  const [data, setData] = useState(initial);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftRange, setDraftRange] = useState<DateRange>(EMPTY_RANGE);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRange, setAppliedRange] = useState<DateRange>(EMPTY_RANGE);
  const [status, setStatus] = useState<KycSubmissionStatus | "all">("all");
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  function fetchPage(
    page: number,
    over?: {
      status?: KycSubmissionStatus | "all";
      search?: string;
      range?: DateRange;
    },
  ) {
    const statusValue = over?.status ?? status;
    const searchValue = over?.search ?? appliedSearch;
    const rangeValue = over?.range ?? appliedRange;
    const id = ++requestId.current;
    startTransition(async () => {
      try {
        const result = await listKycSubmissions({
          status: mode === "pending" ? "pending" : statusValue,
          page,
          search: searchValue,
          from: rangeValue.from || undefined,
          to: rangeValue.to || undefined,
        });
        if (id === requestId.current) setData(result);
      } catch {
        if (id === requestId.current) toast.error("Could not load submissions. Please try again.");
      }
    });
  }

  function applyFilters() {
    setAppliedSearch(draftSearch);
    setAppliedRange(draftRange);
    fetchPage(1, { search: draftSearch, range: draftRange });
  }

  function onStatus(value: KycSubmissionStatus | "all") {
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
          {mode === "all" ? (
            <Select value={status} onValueChange={(value) => onStatus(value as KycSubmissionStatus | "all")}>
              <SelectTrigger className="w-full sm:w-44" aria-label="KYC status">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative xl:w-72">
            <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4" />
            <Input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="Search user or KYC type"
              aria-label="Search KYC submissions"
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
              <TableHead>User</TableHead>
              <TableHead>KYC Type</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  {mode === "pending"
                    ? "No submissions are awaiting review."
                    : "No KYC submissions match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {submission.user.avatarUrl ? (
                          <AvatarImage src={submission.user.avatarUrl} alt={submission.user.name} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {initials(submission.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium whitespace-nowrap">{submission.user.name}</span>
                        <span className="text-muted-foreground text-xs">{submission.user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{submission.templateTitle}</span>
                      <div className="flex items-center gap-1.5">
                        <ApplicableToBadge />
                        {mode === "all" ? <KycStatusBadge status={submission.status} /> : null}
                        {submission.manual ? (
                          <span className="text-muted-foreground text-[11px]">manual</span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StackedTime iso={submission.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      {submission.status === "pending" ? (
                        <KycReviewDialog
                          submission={submission}
                          onReviewed={() => fetchPage(data.page)}
                        />
                      ) : (
                        <KycViewDialog submission={submission} />
                      )}
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
          {`Showing ${from}–${to} of ${data.total} submission${data.total === 1 ? "" : "s"}`}
        </p>
      ) : null}

      <KycPagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isPending}
        onPageChange={(page) => fetchPage(page)}
      />
    </div>
  );
}
