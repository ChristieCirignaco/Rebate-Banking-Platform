"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CheckCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  listAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/admin/notifications/actions";
import { toast } from "@/lib/toast";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotificationPagination } from "./notification-pagination";
import type {
  AdminNotificationItem,
  AdminNotificationsResult,
} from "./types";

// Visual identity per system-alert type. Unknown/legacy types fall back to a bell.
const ALERT_META: Record<
  string,
  { icon: LucideIcon; label: string; className: string }
> = {
  kyc_submitted: {
    icon: ShieldCheck,
    label: "KYC",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  deposit_requested: {
    icon: ArrowDownToLine,
    label: "Deposit",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  withdraw_requested: {
    icon: ArrowUpFromLine,
    label: "Withdrawal",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

const FALLBACK_META = {
  icon: Bell,
  label: "System",
  className: "bg-muted text-muted-foreground",
} as const;

// True only after hydration — lets relative ("2h ago") time render client-side only,
// avoiding a server/client clock mismatch (mirrors the shared StackedTime pattern).
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function NotificationsFeed({
  initial,
}: {
  initial: AdminNotificationsResult;
}) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);
  const hydrated = useHydrated();

  // Server-driven paging; a request token drops any out-of-order response.
  function fetchPage(page: number) {
    const id = ++requestId.current;
    startTransition(async () => {
      const result = await listAdminNotifications({ page });
      if (id === requestId.current) setData(result);
    });
  }

  function handleMarkOne(item: AdminNotificationItem) {
    if (item.read || isPending) return;
    // Optimistic: flip the row and drop the unread count immediately.
    setData((prev) => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
      rows: prev.rows.map((row) =>
        row.id === item.id ? { ...row, read: true } : row,
      ),
    }));
    startTransition(async () => {
      const result = await markNotificationRead(item.id);
      if (!result.ok) {
        toast.error(result.error);
        fetchPage(data.page); // reconcile with the server on failure
      }
    });
  }

  function handleMarkAll() {
    if (data.unreadCount === 0 || isPending) return;
    setData((prev) => ({
      ...prev,
      unreadCount: 0,
      rows: prev.rows.map((row) => ({ ...row, read: true })),
    }));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        toast.error(result.error);
        fetchPage(data.page);
        return;
      }
      toast.success("All notifications marked as read.");
    });
  }

  const isEmpty = data.rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {data.total === 0
            ? "No notifications yet."
            : `${data.total} notification${data.total === 1 ? "" : "s"}`}
          {data.unreadCount > 0 ? (
            <Badge variant="secondary" className="ml-2 px-1.5">
              {data.unreadCount} unread
            </Badge>
          ) : null}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAll}
          disabled={data.unreadCount === 0 || isPending}
        >
          <CheckCheck className="size-4" />
          Mark all as read
        </Button>
      </div>

      <Card
        className={cn("overflow-hidden py-0", isPending && "opacity-60")}
        aria-busy={isPending}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Bell className="text-muted-foreground size-6" />
            </div>
            <div>
              <p className="font-medium">You&apos;re all caught up</p>
              <p className="text-muted-foreground text-sm">
                System alerts for KYC, deposit and withdrawal requests will show
                up here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {data.rows.map((item) => {
              const meta = ALERT_META[item.type] ?? FALLBACK_META;
              const Icon = meta.icon;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "relative flex gap-3 p-4 transition-colors sm:gap-4",
                    !item.read && "bg-primary/[0.04]",
                  )}
                >
                  {!item.read ? (
                    <span
                      aria-hidden
                      className="bg-primary absolute inset-y-0 left-0 w-0.5"
                    />
                  ) : null}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      meta.className,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          item.read ? "font-medium" : "font-semibold",
                        )}
                      >
                        {item.title ?? meta.label}
                      </span>
                      <Badge variant="outline" className="text-[11px]">
                        {meta.label}
                      </Badge>
                      {!item.read ? (
                        <span
                          className="bg-primary size-2 rounded-full"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm break-words">
                      {item.message}
                    </p>
                    <span
                      suppressHydrationWarning
                      className="text-muted-foreground mt-0.5 text-xs"
                      title={formatDateTime(item.createdAt)}
                    >
                      {formatDateTime(item.createdAt)}
                      {hydrated ? ` · ${formatRelativeTime(item.createdAt)}` : ""}
                    </span>
                  </div>

                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      disabled={isPending}
                      aria-label={`Mark "${item.title ?? meta.label}" as read`}
                      onClick={() => handleMarkOne(item)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <NotificationPagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isPending}
        onPageChange={fetchPage}
      />
    </div>
  );
}
