"use client";

import { useRef, useState, useTransition } from "react";
import { Filter, KeyRound, Plus, RotateCcw, Search } from "lucide-react";

import { listActivationCodes } from "@/app/admin/activation-codes/actions";
import { StackedTime } from "@/components/admin/deposits/shared";
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
import { ActivationCodePagination } from "./activation-code-pagination";
import { ActivationCodeRowActions } from "./activation-code-row-actions";
import { CodeStatusBadge, CodeTypeBadge, usageLabel } from "./activation-code-badges";
import { CreateCodeDialog } from "./create-code-dialog";
import type {
  ActivationCodeListResult,
  ActivationCodeStatus,
  ActivationCodeType,
} from "./types";

const STATUS_OPTIONS: { value: ActivationCodeStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const TYPE_OPTIONS: { value: ActivationCodeType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "admin_created", label: "Admin Created" },
  { value: "user_entered", label: "User Entered" },
];

export function ActivationCodesView({ initial }: { initial: ActivationCodeListResult }) {
  const [data, setData] = useState(initial);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState<ActivationCodeStatus | "all">("all");
  const [draftType, setDraftType] = useState<ActivationCodeType | "all">("all");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<ActivationCodeStatus | "all">("all");
  const [appliedType, setAppliedType] = useState<ActivationCodeType | "all">("all");
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  function fetchPage(
    page: number,
    over?: {
      search?: string;
      status?: ActivationCodeStatus | "all";
      type?: ActivationCodeType | "all";
    },
  ) {
    const search = over?.search ?? appliedSearch;
    const status = over?.status ?? appliedStatus;
    const type = over?.type ?? appliedType;
    const id = ++requestId.current;
    startTransition(async () => {
      try {
        const result = await listActivationCodes({ page, search, status, type });
        if (id === requestId.current) setData(result);
      } catch {
        if (id === requestId.current) {
          toast.error("Could not load activation codes. Please try again.");
        }
      }
    });
  }

  function applyFilters() {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedType(draftType);
    fetchPage(1, { search: draftSearch, status: draftStatus, type: draftType });
  }

  function resetFilters() {
    setDraftSearch("");
    setDraftStatus("all");
    setDraftType("all");
    setAppliedSearch("");
    setAppliedStatus("all");
    setAppliedType("all");
    fetchPage(1, { search: "", status: "all", type: "all" });
  }

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.total, data.page * data.pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateCodeDialog onCreated={() => fetchPage(1)}>
          <Button>
            <Plus className="size-4" />
            Create New Code
          </Button>
        </CreateCodeDialog>
      </div>

      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={draftStatus}
            onValueChange={(value) => setDraftStatus(value as ActivationCodeStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Status filter">
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
          <Select
            value={draftType}
            onValueChange={(value) => setDraftType(value as ActivationCodeType | "all")}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Code type filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 xl:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4" />
            <Input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="Search code or admin notes"
              aria-label="Search activation codes"
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={applyFilters} disabled={isPending}>
            <Filter className="size-4" />
            Filter
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters} disabled={isPending}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table aria-busy={isPending} className={cn(isPending && "opacity-60")}>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage Count</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No activation codes match your filters.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <KeyRound className="text-muted-foreground size-3.5" />
                      <span className="font-mono text-sm">{row.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CodeTypeBadge type={row.type} />
                  </TableCell>
                  <TableCell>
                    <CodeStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{usageLabel(row.usageCount)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{row.createdByName ?? "System"}</span>
                  </TableCell>
                  <TableCell>
                    <StackedTime iso={row.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ActivationCodeRowActions
                      row={row}
                      onChanged={() => fetchPage(data.page)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data.total > 0 ? (
        <p className={cn("text-muted-foreground text-sm", isPending && "opacity-60")}>
          {`Showing ${from}–${to} of ${data.total} code${data.total === 1 ? "" : "s"}`}
        </p>
      ) : null}

      <ActivationCodePagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isPending}
        onPageChange={(page) => fetchPage(page)}
      />
    </div>
  );
}
