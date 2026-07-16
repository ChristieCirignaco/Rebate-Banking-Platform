"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowDownUp,
  House,
  LifeBuoy,
  Package,
  PackagePlus,
  Plus,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Tab = { href: string; label: string; icon: LucideIcon; flag?: string };

// Home has no flag — every feature guard redirects to /dashboard, so it can't be switchable.
// A tab whose feature is off is dropped; the bar keeps its shape because the remaining tabs
// flex, and the FAB stays centred.
const TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/products", label: "Products", icon: Package, flag: "products" },
  { href: "/send", label: "Send", icon: Send, flag: "send_money" },
  { href: "/support", label: "Support", icon: LifeBuoy, flag: "support" },
];

// Detail screens (their own back header, no tab bar) — the bar hides on these.
const HIDE_ON = ["/transactions"];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors",
        active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      {tab.label}
    </Link>
  );
}

const QUICK_ACTIONS: { label: string; icon: LucideIcon; href: string; flag?: string }[] = [
  { label: "Deposit", icon: ArrowDownToLine, href: "/deposit", flag: "deposits" },
  { label: "Transfer", icon: ArrowDownUp, href: "/send", flag: "send_money" },
  { label: "Add product", icon: PackagePlus, href: "/products/new", flag: "product_submission" },
];

// The persistent bottom navigation: Home · Products · ⊕ · Send · Support. Fixed and centered so
// it overlays the phone-width column on desktop and spans the screen on mobile. The center FAB
// opens a quick-action sheet; every destination is a real page.
export function BottomTabBar({ enabled = [] }: { enabled?: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const on = new Set(enabled);
  const tabs = TABS.filter((tab) => !tab.flag || on.has(tab.flag));
  const actions = QUICK_ACTIONS.filter((action) => !action.flag || on.has(action.flag));
  // Split evenly around the centre FAB, whatever survived the flags.
  const half = Math.ceil(tabs.length / 2);
  const left = tabs.slice(0, half);
  const right = tabs.slice(half);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[600px] items-end justify-around rounded-t-2xl border-t border-slate-200/70 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.15)] backdrop-blur lg:hidden dark:border-slate-800/80 dark:bg-slate-950/95"
      >
        {left.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} />
        ))}

        <div className="flex w-14 shrink-0 justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Quick actions"
            className="-mt-8 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/40 ring-4 ring-white transition-transform active:scale-95 dark:ring-slate-950"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        </div>

        {right.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} />
        ))}
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="sm:mx-auto sm:max-w-[480px]">
          <DrawerHeader>
            <DrawerTitle>Quick actions</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-3 p-4 pt-0">
            {actions.map((action) => {
              const Icon = action.icon;
              const className =
                "flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-4 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900";
              const inner = (
                <>
                  <span className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Icon className="size-5" />
                  </span>
                  {action.label}
                </>
              );
              return (
                <DrawerClose asChild key={action.label}>
                  <Link href={action.href} className={className}>
                    {inner}
                  </Link>
                </DrawerClose>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
