"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateTicketStatus } from "@/app/admin/support-ticket/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import type { TicketStatus } from "./types";

const OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

// `status` is a Server Component prop, not a persistent identity, so this must be
// remounted (not synced via effect) whenever it changes server-side — e.g. sending a
// reply flips the ticket to "replied" and a plain useState(status) would go stale after
// router.refresh(). The call site keys this component by `status` for exactly that reason.
export function TicketStatusSelect({ id, status }: { id: string; status: TicketStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    const nextStatus = next as TicketStatus;
    const previous = value;
    setValue(nextStatus); // optimistic
    startTransition(async () => {
      const result = await updateTicketStatus(id, nextStatus);
      if (result.ok) {
        toast.success(`Status updated to ${nextStatus}.`);
        router.refresh();
      } else {
        setValue(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-40" aria-label="Ticket status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
