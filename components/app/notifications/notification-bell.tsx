"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";

import {
  getRecentNotificationsAction,
  getUnreadCountAction,
  markNotificationRead,
} from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";
import type { UserNotificationItem } from "@/lib/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Broadcast by the notifications list after a mark-read so any mounted bell re-pulls its
// count. router.refresh() alone can't do this: it re-renders server components, but the bell
// is a client component that isn't remounted and the pathname doesn't change, so its effect
// would never re-run and the badge would sit stale on /notifications itself.
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

export function notifyNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

// The two headers style their icon buttons differently (the mobile hero sits on a colored
// gradient, the desktop header on a light surface), so the bell ships both looks rather than
// forcing one. Defaults to `surface`; pass nothing at all and it still renders.
const VARIANTS = {
  hero: "relative flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20",
  surface:
    "relative flex size-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
} as const;

export interface NotificationBellProps {
  variant?: keyof typeof VARIANTS;
  className?: string;
}

// Header bell + unread badge + a preview panel of the newest notices, self-contained: it takes
// no required props and pulls its own data through server actions, so it can be dropped straight
// into a server component. Client-only by necessity (state + effects) — it imports the server
// actions and nothing that would drag Prisma into the browser bundle.
export function NotificationBell({ variant = "surface", className }: NotificationBellProps) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotificationItem[] | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    void getUnreadCountAction()
      .then((next) => {
        if (!cancelled) setCount(next);
      })
      // A transient failure leaves the last known badge in place rather than flashing to 0.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-pull on mount and on every navigation, so reading a notice settles the badge.
  useEffect(() => refresh(), [refresh, pathname]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [refresh]);

  // The panel fetches on each open rather than once: it's a preview of live data, and a stale
  // list behind a fresh badge would be worse than a brief spinner.
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setItems(null);
    void getRecentNotificationsAction()
      .then(setItems)
      .catch(() => setItems([]));
  }

  // Reading one from the panel settles it immediately, then re-pulls the badge.
  function onRead(item: UserNotificationItem) {
    if (item.read) return;
    setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? prev);
    void markNotificationRead(item.id).then(() => refresh());
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={count > 0 ? `Notifications (${count} unread)` : "Notifications"}
        className={className ?? VARIANTS[variant]}
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </PopoverTrigger>

      {/* Responsive: a fixed panel would overflow a phone, so it takes the viewport width minus
          the page gutter and only caps at 22rem once there's room.

          collisionPadding matches that gutter, and on mobile it is what actually places the
          panel. align="end" anchors to the TRIGGER's right edge, which stopped being the screen's
          right edge once the hamburger moved beside the bell — a 100vw-2rem panel anchored there
          doesn't fit, so Radix shifts it back into view, and with the default collisionPadding of
          0 that meant flush against one edge with the whole 2rem gap dumped on the other. At 16px
          the shift leaves an even 1rem either side, so the width and the padding agree instead of
          fighting. Desktop is unaffected: max-w-[22rem] fits with room to spare, so nothing
          collides and align="end" still tucks it under the bell. */}
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="w-[calc(100vw-2rem)] max-w-[22rem] p-0"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
          {count > 0 ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              {count} unread
            </span>
          ) : null}
        </div>

        <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
          {items === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-4 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-center">
              <Bell className="size-6 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No notifications yet</p>
              <p className="text-xs text-slate-400">We&apos;ll let you know when something happens.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRead(item)}
                  className="flex items-start gap-3 p-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                      item.read
                        ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                    )}
                  >
                    <Bell className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "truncate text-sm",
                          item.read
                            ? "font-medium text-slate-600 dark:text-slate-300"
                            : "font-semibold text-slate-900 dark:text-white",
                        )}
                      >
                        {item.title ?? "Notification"}
                      </span>
                      {item.read ? null : (
                        <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">
                      {item.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">{item.dateLabel}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
