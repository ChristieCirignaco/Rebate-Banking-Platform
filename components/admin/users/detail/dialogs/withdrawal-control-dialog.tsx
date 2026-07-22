"use client";

import * as React from "react";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  PauseCircle,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ActionIconButton } from "../shared";
import type {
  UserDetail,
  WithdrawalControlPayload,
  WithdrawalStatus,
} from "../types";

type Impact = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  box: string;
  iconColor: string;
  selectLabel: string;
};

const STATUS_IMPACT: Record<WithdrawalStatus, Impact> = {
  allowed: {
    icon: CheckCircle2,
    title: "Full Access",
    description: "User can withdraw normally",
    box: "border-emerald-500/30 bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    selectLabel: "Allowed - Normal withdrawal access",
  },
  pending: {
    icon: Clock,
    title: "Review Required",
    description: "Withdrawals will show pending page",
    box: "border-amber-500/30 bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    selectLabel: "Pending - Withdrawals need review",
  },
  hold: {
    icon: PauseCircle,
    title: "Temporary Hold",
    description: "Withdrawals blocked temporarily",
    box: "border-slate-500/30 bg-slate-500/10",
    iconColor: "text-slate-600 dark:text-slate-300",
    selectLabel: "Hold - Temporarily blocked",
  },
  suspended: {
    icon: Ban,
    title: "Account Issue",
    description: "Serious restriction in place",
    box: "border-rose-500/30 bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    selectLabel: "Suspended - Serious restriction",
  },
  restricted: {
    icon: AlertTriangle,
    title: "Limited Access",
    description: "Verification required",
    box: "border-neutral-500/30 bg-neutral-500/10",
    iconColor: "text-neutral-700 dark:text-neutral-300",
    selectLabel: "Restricted - Verification required",
  },
};

const STATUS_ORDER: WithdrawalStatus[] = [
  "allowed",
  "pending",
  "hold",
  "suspended",
  "restricted",
];

export function WithdrawalControlDialog({
  user,
  onUpdateStatus,
}: {
  user: UserDetail;
  onUpdateStatus: (payload: WithdrawalControlPayload) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<WithdrawalStatus>(
    user.withdrawalStatus,
  );
  const [userMessage, setUserMessage] = React.useState(user.withdrawalMessage);

  // Seed the form from the user's actual saved control each time it opens — the props are
  // fresh from the server, so re-reading them here keeps the form in sync after a
  // router.refresh() without a setState-in-effect.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setStatus(user.withdrawalStatus);
      setUserMessage(user.withdrawalMessage);
    }
  }

  const impact = STATUS_IMPACT[status];
  const ImpactIcon = impact.icon;
  const currentImpact = STATUS_IMPACT[user.withdrawalStatus];

  function handleUpdate() {
    onUpdateStatus({
      status,
      userMessage: userMessage || undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ActionIconButton
          icon={ShieldAlert}
          tint="sky"
          fill
          label="Withdrawal Control"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Withdrawal Control</DialogTitle>
          <DialogDescription>
            Manage withdrawal access for {user.name}.
          </DialogDescription>
        </DialogHeader>

        <>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs uppercase">
                  User Information
                </p>
                <p className="mt-1 font-medium">{user.name}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs uppercase">
                  Current Status
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    className={cn(
                      "border capitalize",
                      currentImpact.box,
                      currentImpact.iconColor,
                    )}
                  >
                    {user.withdrawalStatus}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {currentImpact.title}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Withdrawal Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as WithdrawalStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((value) => (
                      <SelectItem key={value} value={value}>
                        {STATUS_IMPACT[value].selectLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3",
                  impact.box,
                )}
              >
                <ImpactIcon
                  className={cn("mt-0.5 size-4 shrink-0", impact.iconColor)}
                />
                <div>
                  <p className="text-sm font-medium">{impact.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {impact.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wc-user-message">User Message</Label>
              <Textarea
                id="wc-user-message"
                rows={2}
                value={userMessage}
                onChange={(event) => setUserMessage(event.target.value)}
                placeholder="Message shown to the user"
              />
              <p className="text-muted-foreground text-xs">
                This message will be displayed to the user when they try to
                withdraw and will be sent via email.
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Important
              </p>
              <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-4 text-xs">
                <li>
                  Any non-allowed status redirects the user to a status page.
                </li>
                <li>An email is sent to the user with your message.</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate}>Update Status</Button>
          </DialogFooter>
        </>
      </DialogContent>
    </Dialog>
  );
}
