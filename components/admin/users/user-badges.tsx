import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmailStatus, KycStatus, OnlineStatus, UserRole } from "./types";

const ROLE_STYLES: Record<UserRole, string> = {
  user: "border-transparent bg-slate-500/12 text-slate-600 dark:text-slate-300",
  admin: "border-transparent bg-blue-500/12 text-blue-600 dark:text-blue-400",
  superadmin:
    "border-transparent bg-violet-500/12 text-violet-600 dark:text-violet-400",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge className={cn("uppercase", ROLE_STYLES[role])}>{role}</Badge>;
}

export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  if (status === "verified") {
    return (
      <Badge className="border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
        VERIFIED
      </Badge>
    );
  }
  return <Badge variant="secondary">UNVERIFIED</Badge>;
}

const KYC_STYLES: Record<KycStatus, { label: string; className: string }> = {
  approved: {
    label: "APPROVED",
    className:
      "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  },
  pending: {
    label: "PENDING",
    className:
      "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  not_submitted: {
    label: "NOT SUBMITTED",
    className:
      "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
  rejected: {
    label: "REJECTED",
    className:
      "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  },
};

export function KycStatusBadge({ status }: { status: KycStatus }) {
  const style = KYC_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}

export function CodeBadge({ code }: { code?: string }) {
  if (!code) return <span className="text-muted-foreground">--</span>;
  return (
    <Badge variant="outline" className="gap-1 font-mono">
      <Lock className="size-3" />
      {code}
    </Badge>
  );
}

export function OnlineDot({ status }: { status: OnlineStatus }) {
  const online = status === "online";
  return (
    <span
      title={online ? "Online" : "Offline"}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        online ? "bg-emerald-500" : "bg-muted-foreground/40",
      )}
    />
  );
}
