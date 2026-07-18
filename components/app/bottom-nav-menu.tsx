"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { visibleNav } from "@/components/app/app-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// The full-nav menu, opened from the bottom tab bar's last slot — this replaces the header
// hamburger drawer. Adapted from uselayouts' "smooth-dropdown" (uselayouts.com/docs/components/
// smooth-dropdown): its spring physics, staggered item entrance and click-outside-to-close, but
// re-skinned with the app's lucide icons and real flag-filtered nav instead of the demo's
// hardcoded Hugeicons items, and anchored to open UPWARD from the bar rather than down.

const easeOutQuint = [0.23, 1, 0.32, 1] as const;

type MenuUser = {
  name: string;
  email: string;
  image: string | null | undefined;
};

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "U";
}

export function BottomNavMenu({
  user,
  enabled = [],
}: {
  user: MenuUser;
  enabled?: string[];
}) {
  const nav = visibleNav(enabled);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when a tap lands outside the menu (the smooth-dropdown behaviour).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // No close-on-route effect is needed: every nav Link closes the panel in its own onClick, and
  // any tap outside the menu (another tab, the FAB) is caught by the click-outside handler above.

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      window.location.href = "/login";
    });
  }

  const menuActive =
    open ||
    nav.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 flex-col items-center"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Menu"
        aria-expanded={open}
        className={cn(
          "flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors",
          menuActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-400 dark:text-slate-500",
        )}
      >
        <Menu className="size-5" strokeWidth={menuActive ? 2.4 : 2} />
        Menu
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{
              type: "spring",
              damping: 34,
              stiffness: 380,
              mass: 0.8,
            }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute right-0 bottom-full mb-3 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="max-h-[60vh] overflow-y-auto p-2">
              <ul className="flex flex-col gap-0.5">
                {nav.map((item, index) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.04 + index * 0.02,
                        duration: 0.15,
                        ease: easeOutQuint,
                      }}
                    >
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                        )}
                      >
                        <Icon
                          className="size-[18px]"
                          strokeWidth={isActive ? 2.4 : 2}
                        />
                        {item.label}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>

              <hr className="my-2 border-slate-100 dark:border-slate-800" />

              <div className="flex items-center gap-2">
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar
                    size="sm"
                    className="ring-1 ring-slate-200 dark:ring-slate-700"
                  >
                    {user.image ? (
                      <AvatarImage src={user.image} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-blue-600 text-[10px] font-semibold text-white">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={pending}
                  aria-label="Sign out"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
