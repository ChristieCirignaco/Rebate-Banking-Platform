"use client";

import { useSyncExternalStore } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { DepositUserSummary } from "./types";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// True only after client hydration (server snapshot is false). Lets us render clock- and
// timezone-sensitive text on the client only, with no setState-in-effect.
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// Datetime (UTC, deterministic) over relative time. The relative time depends on the
// current clock, so it's rendered only after hydration to avoid a server/client mismatch.
export function StackedTime({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  return (
    <div className="flex flex-col">
      <span className="text-sm whitespace-nowrap">{formatDateTime(iso)}</span>
      <span suppressHydrationWarning className="text-muted-foreground text-xs">
        {hydrated ? formatRelativeTime(iso) : ""}
      </span>
    </div>
  );
}

// Avatar + name + txn id, the shared "User | Txn ID" cell.
export function UserTxnCell({
  user,
  txnId,
}: {
  user: DepositUserSummary;
  txnId: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
        <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium whitespace-nowrap">{user.name}</span>
        <span className="text-muted-foreground font-mono text-xs">{txnId}</span>
      </div>
    </div>
  );
}
