"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Eye, MoreHorizontal, UserCheck } from "lucide-react";

import {
  getActivationCodeDetailAction,
  setActivationCodeStatus,
} from "@/app/admin/activation-codes/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";
import { SuspendCodeDialog } from "./suspend-code-dialog";
import { ViewCodeDialog } from "./view-code-dialog";
import type { ActivationCodeDetail, ActivationCodeListItem } from "./types";

// The View/Suspend dialogs are controlled from here rather than owning their own
// DropdownMenuItem trigger — nesting a Dialog inside a DropdownMenuItem closes the menu
// before the dialog can open, so `onSelect` just flips external state instead. The detail
// fetch also lives in that same click handler (a real event), not an effect in the dialog.
export function ActivationCodeRowActions({
  row,
  onChanged,
}: {
  row: ActivationCodeListItem;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewDetail, setViewDetail] = useState<ActivationCodeDetail | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  function openView() {
    setViewOpen(true);
    setViewLoading(true);
    setViewDetail(null);
    const id = ++requestId.current;
    startTransition(async () => {
      try {
        const result = await getActivationCodeDetailAction(row.id);
        if (id !== requestId.current) return;
        if (!result) {
          toast.error("Could not load this code.");
          setViewOpen(false);
        } else {
          setViewDetail(result);
        }
      } catch {
        if (id !== requestId.current) return;
        toast.error("Could not load this code.");
        setViewOpen(false);
      } finally {
        if (id === requestId.current) setViewLoading(false);
      }
    });
  }

  function reactivate() {
    startTransition(async () => {
      const result = await setActivationCodeStatus(row.id, "active");
      if (result.ok) {
        toast.success(`${row.code} has been reactivated.`);
        onChanged();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={isPending}
            onSelect={(event) => {
              event.preventDefault();
              openView();
            }}
          >
            <Eye className="size-4" />
            View Details
          </DropdownMenuItem>
          {row.status === "suspended" ? (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                reactivate();
              }}
            >
              <UserCheck className="size-4" />
              Reactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                setSuspendOpen(true);
              }}
            >
              <Ban className="size-4" />
              Suspend
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewCodeDialog open={viewOpen} onOpenChange={setViewOpen} loading={viewLoading} detail={viewDetail} />
      <SuspendCodeDialog
        id={row.id}
        code={row.code}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onChanged={onChanged}
      />
    </>
  );
}
