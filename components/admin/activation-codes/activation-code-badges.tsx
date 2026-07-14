import { Badge } from "@/components/ui/badge";
import type { ActivationCodeStatus, ActivationCodeType } from "./types";

const TYPE_STYLES: Record<ActivationCodeType, { label: string; className: string }> = {
  admin_created: {
    label: "Admin Created",
    className: "border-transparent bg-blue-500/12 text-blue-600 dark:text-blue-400",
  },
  user_entered: {
    label: "User Entered",
    className: "border-transparent bg-violet-500/12 text-violet-600 dark:text-violet-400",
  },
};

export function CodeTypeBadge({ type }: { type: ActivationCodeType }) {
  const style = TYPE_STYLES[type];
  return <Badge className={style.className}>{style.label}</Badge>;
}

const STATUS_STYLES: Record<ActivationCodeStatus, { label: string; className: string }> = {
  active: {
    label: "ACTIVE",
    className: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  suspended: {
    label: "SUSPENDED",
    className: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function CodeStatusBadge({ status }: { status: ActivationCodeStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}

// Shared "Usage Count" formatting for both the list table and the detail dialog.
export function usageLabel(count: number): string {
  if (count === 0) return "0";
  return `${count} ${count === 1 ? "time" : "times"} used`;
}
