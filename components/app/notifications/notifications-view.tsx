"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(app)/notifications/actions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { UserNotificationItem } from "@/lib/notifications";
import { notifyNotificationsChanged } from "@/components/app/notifications/notification-bell";

const ROW = "flex items-center gap-3 p-3.5";

export function NotificationsView({ items }: { items: UserNotificationItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Ids optimistically flipped to read on the client. Rows are DERIVED from the server list
  // plus this set rather than copied into state, so a router.refresh() flows straight through
  // with no effect to re-sync and no stale snapshot to reconcile.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());

  const rows = items.map((item) =>
    !item.read && readIds.has(item.id) ? { ...item, read: true } : item,
  );
  const unread = rows.reduce((total, row) => total + (row.read ? 0 : 1), 0);

  function markOne(item: UserNotificationItem) {
    if (item.read || isPending) return;
    // Optimistic: flip the row now, roll the id back out of the set on failure.
    setReadIds((prev) => new Set(prev).add(item.id));
    startTransition(async () => {
      const result = await markNotificationRead(item.id);
      if (!result.ok) {
        toast.error(result.error);
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        return;
      }
      notifyNotificationsChanged();
      router.refresh();
    });
  }

  function markAll() {
    if (unread === 0 || isPending) return;
    const snapshot = readIds;
    setReadIds(new Set(items.map((item) => item.id)));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        toast.error(result.error);
        setReadIds(snapshot);
        return;
      }
      toast.success("All notifications marked as read.");
      notifyNotificationsChanged();
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
        <Bell className="size-6 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No notifications yet</p>
        <p className="text-xs text-slate-400">Updates about your account will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {unread > 0 ? `${unread} unread` : "You're all caught up"}
        </p>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            disabled={isPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
        {rows.map((item) =>
          item.read ? (
            <div key={item.id} className={ROW}>
              <Chip read />
              <Body item={item} />
            </div>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => markOne(item)}
              disabled={isPending}
              aria-label={`Mark "${item.title ?? "notification"}" as read`}
              className={cn(ROW, "w-full text-left transition-colors hover:bg-slate-50")}
            >
              <Chip read={false} />
              <Body item={item} />
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-blue-600" />
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function Chip({ read }: { read: boolean }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        read ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600",
      )}
    >
      <Bell className="size-4" />
    </span>
  );
}

function Body({ item }: { item: UserNotificationItem }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-slate-900">{item.title ?? "Notification"}</p>
      <p className="truncate text-xs text-slate-500">{item.message}</p>
      <p className="truncate text-xs text-slate-400">{item.dateLabel}</p>
    </div>
  );
}
