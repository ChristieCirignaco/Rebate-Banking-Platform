import { Badge } from "@/components/ui/badge";
import type { TicketPriority, TicketStatus } from "./types";

const PRIORITY_STYLES: Record<TicketPriority, { label: string; className: string }> = {
  low: {
    label: "LOW",
    className: "border-transparent bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
  medium: {
    label: "MEDIUM",
    className: "border-transparent bg-blue-500/12 text-blue-600 dark:text-blue-400",
  },
  high: {
    label: "HIGH",
    className: "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  urgent: {
    label: "URGENT",
    className: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const style = PRIORITY_STYLES[priority];
  return <Badge className={style.className}>{style.label}</Badge>;
}

const STATUS_STYLES: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: "OPEN",
    className: "border-transparent bg-blue-500/12 text-blue-600 dark:text-blue-400",
  },
  pending: {
    label: "PENDING",
    className: "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  replied: {
    label: "REPLIED",
    className: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  closed: {
    label: "CLOSED",
    className: "border-transparent bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}
