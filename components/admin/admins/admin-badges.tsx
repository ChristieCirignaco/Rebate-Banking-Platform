import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdminAccountStatus, AdminRole } from "./types";

const ROLE_STYLES: Record<AdminRole, string> = {
  admin: "border-transparent bg-blue-500/12 text-blue-600 dark:text-blue-400",
  super_admin:
    "border-transparent bg-violet-500/12 text-violet-600 dark:text-violet-400",
};

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
};

export function AdminRoleBadge({ role }: { role: AdminRole }) {
  return (
    <Badge className={cn("uppercase", ROLE_STYLES[role])}>{ROLE_LABELS[role]}</Badge>
  );
}

const STATUS_STYLES: Record<AdminAccountStatus, { label: string; className: string }> = {
  active: {
    label: "ACTIVE",
    className: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  suspended: {
    label: "SUSPENDED",
    className: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
  pending: {
    label: "PENDING",
    className: "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
};

export function AdminStatusBadge({ status }: { status: AdminAccountStatus }) {
  const style = STATUS_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}
