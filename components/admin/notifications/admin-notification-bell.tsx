"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  HandCoins,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Package,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  getAdminRecentAlertsAction,
  getAdminUnreadCountAction,
  markNotificationRead,
} from "@/app/admin/notifications/actions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AdminNotificationItem } from "./types";

// Same identities as the /admin/notifications feed. Kept in step with ALERT_META there —
// a type missing here just falls back to the bell rather than rendering nothing.
const ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  kyc_submitted: { icon: ShieldCheck, className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  deposit_requested: { icon: ArrowDownToLine, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  withdraw_requested: { icon: ArrowUpFromLine, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  transfer_requested: { icon: ArrowLeftRight, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  money_requested: { icon: HandCoins, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  products_submitted: { icon: Package, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  ticket_opened: { icon: LifeBuoy, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  ticket_reply: { icon: MessageCircle, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};
const FALLBACK = { icon: Bell, className: "bg-muted text-muted-foreground" };

// The admin header bell: unread badge + a panel of the newest alerts, with the full history at
// /admin/notifications. Self-contained (no props) so it drops into the server-rendered header;
// it pulls its own data through server actions that return empty rather than redirect, since it
// mounts on every admin page.
export function AdminNotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[] | null>(null);

  const refreshCount = useCallback(() => {
    void getAdminUnreadCountAction()
      .then(setCount)
      // A transient failure keeps the last known badge rather than flashing to 0.
      .catch(() => {});
  }, []);

  // Re-pull on mount and on every navigation, so acting on an alert settles the badge.
  useEffect(() => refreshCount(), [refreshCount, pathname]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setItems(null);
    void getAdminRecentAlertsAction()
      .then(setItems)
      .catch(() => setItems([]));
  }

  function onRead(item: AdminNotificationItem) {
    if (item.read) return;
    setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? prev);
    void markNotificationRead(item.id).then(() => refreshCount());
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={count > 0 ? `Notifications (${count} unread)` : "Notifications"}
        className="hover:bg-muted relative flex size-9 items-center justify-center rounded-full transition-colors"
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </PopoverTrigger>

      {/* Responsive: never wider than the viewport gutter allows, capped at 24rem. */}
      <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] max-w-96 p-0">
        <div className="flex items-center justify-between border-b px-3.5 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 ? (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {count} unread
            </span>
          ) : null}
        </div>

        <div className="max-h-[min(60vh,24rem)] overflow-y-auto">
          {items === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-center">
              <Bell className="text-muted-foreground/40 size-6" />
              <p className="text-sm font-medium">You&apos;re all caught up</p>
              <p className="text-muted-foreground text-xs">New system alerts land here.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((item) => {
                const meta = ICONS[item.type] ?? FALLBACK;
                const Icon = meta.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onRead(item)}
                      className={cn(
                        "hover:bg-muted/50 flex w-full items-start gap-3 p-3.5 text-left transition-colors",
                        !item.read && "bg-primary/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          meta.className,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm",
                              item.read ? "font-medium" : "font-semibold",
                            )}
                          >
                            {item.title ?? "System alert"}
                          </span>
                          {item.read ? null : (
                            <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                          )}
                        </span>
                        <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
                          {item.message}
                        </span>
                        <span className="text-muted-foreground/70 mt-1 block text-[11px]">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t p-2">
          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            className="bg-muted hover:bg-muted/70 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
