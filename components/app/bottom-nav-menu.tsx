"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import useMeasure from "react-use-measure";
import { LogOut, Menu } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { visibleNav } from "@/components/app/app-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// The full-nav menu, opened from the bottom tab bar's last slot — this replaces the header
// hamburger drawer. Adapted from uselayouts' "smooth-dropdown"
// (uselayouts.com/docs/components/smooth-dropdown): a SINGLE element that morphs its own
// width/height from the trigger into the panel with a spring, the trigger fading out as the
// measured content fades and staggers in. Re-skinned with the app's lucide icons and real
// flag-filtered nav, and anchored bottom-right so it grows UPWARD out of the bar instead of down.

const easeOutQuint = [0.23, 1, 0.32, 1] as const;

// The trigger footprint (a nav-tab-sized target) and the opened panel width. Height is measured,
// not fixed, so the morph lands exactly on the content — the point of the effect.
const COLLAPSED_W = 72;
const COLLAPSED_H = 48;
const OPEN_W = 248;

type MenuUser = { name: string; email: string; image: string | null | undefined };

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "U";
}

export function BottomNavMenu({ user, enabled = [] }: { user: MenuUser; enabled?: string[] }) {
  const nav = visibleNav(enabled);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  // Measures the (always-rendered) content so the container can morph to its exact height. The
  // content box is capped at 60vh and scrolls, so this height never exceeds the viewport.
  const [contentRef, contentBounds] = useMeasure();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      window.location.href = "/login";
    });
  }

  const openHeight = Math.max(COLLAPSED_H, Math.ceil(contentBounds.height));
  const routeActive = nav.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const triggerTint = open || routeActive;

  return (
    <div ref={containerRef} className="relative flex-1" style={{ height: COLLAPSED_H }}>
      <motion.div
        initial={false}
        animate={{
          width: open ? OPEN_W : COLLAPSED_W,
          height: open ? openHeight : COLLAPSED_H,
          borderRadius: open ? 16 : 12,
        }}
        transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.8 }}
        style={{ transformOrigin: "bottom right" }}
        className="absolute right-0 bottom-0 cursor-pointer overflow-hidden"
        onClick={() => !open && setOpen(true)}
      >
        {/* Card surface — fades in as the element grows, so the collapsed trigger reads as a flat
            tab and the open state as a panel, all one morphing element. */}
        <motion.div
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        />

        {/* Collapsed trigger — the tab, fades out on open. */}
        <motion.div
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          style={{ pointerEvents: open ? "none" : "auto" }}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
            triggerTint ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
          )}
        >
          <Menu className="size-5" strokeWidth={triggerTint ? 2.4 : 2} />
          Menu
        </motion.div>

        {/* Panel content — measured (so the morph targets its height), fades + staggers in. */}
        <div ref={contentRef} className="relative">
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.2, delay: open ? 0.08 : 0 }}
            style={{ pointerEvents: open ? "auto" : "none", width: OPEN_W }}
            className="max-h-[60vh] overflow-y-auto p-2"
          >
            <ul className="flex flex-col gap-0.5">
              {nav.map((item, index) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.href}
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, x: open ? 0 : 8 }}
                    transition={{
                      delay: open ? 0.06 + index * 0.02 : 0,
                      duration: 0.15,
                      ease: easeOutQuint,
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                      )}
                    >
                      {isActive ? (
                        <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      ) : null}
                      <Icon className="size-[18px]" strokeWidth={isActive ? 2.4 : 2} />
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
                <Avatar size="sm" className="ring-1 ring-slate-200 dark:ring-slate-700">
                  {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
