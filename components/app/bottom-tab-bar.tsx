"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownUp,
  ArrowUpFromLine,
  ChevronRight,
  House,
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
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BottomNavMenu } from "@/components/app/bottom-nav-menu";

type MenuUser = {
  name: string;
  email: string;
  image: string | null | undefined;
};

type Tab = { href: string; label: string; icon: LucideIcon; flag?: string };

// Home has no flag — every feature guard redirects to /dashboard, so it can't be switchable.
// A tab whose feature is off is dropped; the bar keeps its shape because the remaining tabs
// flex, and the FAB stays centred. Support left the bar: its slot is now the full-nav Menu
// (BottomNavMenu), which reaches Support and everything else — this is where the old header
// hamburger moved to.
const TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/products", label: "Products", icon: Package, flag: "products" },
  { href: "/send", label: "Send", icon: Send, flag: "send_money" },
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
        active
          ? "text-blue-600 dark:text-blue-400"
          : "text-slate-400 dark:text-slate-500",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      {tab.label}
    </Link>
  );
}

// Quick actions listed as rows rather than a fixed 3-up grid: the labels carry a line of
// context, the tap targets are full-width (easier one-thumbed), and — unlike `grid-cols-3` —
// the layout stays correct when a feature flag drops one, instead of leaving a hole in the row.
// Each gets its own accent so they're distinguishable at a glance rather than three identical
// blue circles. Icons/hrefs/flags mirror app-nav so the same feature reads the same everywhere.
const QUICK_ACTIONS: {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  flag?: string;
  accent: string;
}[] = [
  {
    label: "Withdraw",
    description: "Cash out to your bank or wallet",
    icon: ArrowUpFromLine,
    href: "/withdraw",
    flag: "withdrawals",
    accent:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    label: "Transfer",
    description: "Send money to another account",
    icon: ArrowDownUp,
    href: "/send",
    flag: "send_money",
    accent: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    label: "Add product",
    description: "Submit a purchase for rebate review",
    icon: PackagePlus,
    href: "/products/new",
    flag: "product_submission",
    accent:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
];

// The persistent bottom navigation: Home · Products · ⊕ · Send · Menu. Fixed and centered so
// it overlays the phone-width column on desktop and spans the screen on mobile. The center FAB
// opens a quick-action sheet; the last slot opens the full-nav menu.
export function BottomTabBar({
  enabled = [],
  user,
}: {
  enabled?: string[];
  user: MenuUser;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return null;

  const on = new Set(enabled);
  const tabs = TABS.filter((tab) => !tab.flag || on.has(tab.flag));
  const actions = QUICK_ACTIONS.filter(
    (action) => !action.flag || on.has(action.flag),
  );
  // Split evenly around the centre FAB, whatever survived the flags.
  const half = Math.ceil(tabs.length / 2);
  const left = tabs.slice(0, half);
  const right = tabs.slice(half);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[600px] items-end justify-around rounded-t-2xl border-t border-slate-200/70 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.15)] backdrop-blur lg:hidden dark:border-slate-800/80 dark:bg-slate-950/95">
        {left.map((tab) => (
          <TabLink
            key={tab.href}
            tab={tab}
            active={isActive(pathname, tab.href)}
          />
        ))}

        <div className="flex w-14 shrink-0 justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Quick actions"
            className="-mt-8 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg ring-4 shadow-blue-600/40 ring-white transition-transform active:scale-95 dark:ring-slate-950"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        </div>

        {right.map((tab) => (
          <TabLink
            key={tab.href}
            tab={tab}
            active={isActive(pathname, tab.href)}
          />
        ))}

        <BottomNavMenu user={user} enabled={enabled} />
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="sm:mx-auto sm:max-w-[480px]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Quick actions</DrawerTitle>
            {/* vaul warns when a drawer has no description, and it's the a11y announcement
                for screen readers on open — not decoration. */}
            <DrawerDescription>Jump straight to what you need.</DrawerDescription>
          </DrawerHeader>

          {/* min-h-0 + overflow-y-auto so this list is what shrinks and scrolls if the actions
              ever outgrow the sheet's 80dvh cap (more actions, or a short phone in landscape) —
              a flex child won't scroll without min-h-0. pb clears the home indicator on
              gesture-nav phones; without the safe-area inset the last row sits under it. */}
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <DrawerClose asChild key={action.label}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition-colors active:bg-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800 dark:hover:bg-slate-900"
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full",
                        action.accent,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        {action.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {action.description}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-slate-300 dark:text-slate-600" />
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
