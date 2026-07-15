"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowDownUp,
  ChartColumn,
  House,
  PackagePlus,
  Plus,
  Settings,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Tab = { href: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/statistic", label: "Statistic", icon: ChartColumn },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
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

const QUICK_ACTIONS: { label: string; icon: LucideIcon; hint: string }[] = [
  { label: "Deposit", icon: ArrowDownToLine, hint: "Deposits are coming soon." },
  { label: "Transfer", icon: ArrowDownUp, hint: "Transfers are coming soon." },
  { label: "Add product", icon: PackagePlus, hint: "Product submissions are coming soon." },
];

// The persistent bottom navigation from the mockup: Home · Statistic · ⊕ · Wallet · Settings.
// Fixed and centered so it overlays the phone-width column on desktop and spans the screen on
// mobile. The center FAB opens a quick-action sheet; those destinations are stubbed for now.
export function BottomTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const [home, statistic, wallet, settings] = TABS;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[600px] items-end justify-around border-t border-slate-200/70 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:border-slate-800/80 dark:bg-slate-950/95"
      >
        <TabLink tab={home} active={isActive(pathname, home.href)} />
        <TabLink tab={statistic} active={isActive(pathname, statistic.href)} />

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

        <TabLink tab={wallet} active={isActive(pathname, wallet.href)} />
        <TabLink tab={settings} active={isActive(pathname, settings.href)} />
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="sm:mx-auto sm:max-w-[480px]">
          <DrawerHeader>
            <DrawerTitle>Quick actions</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-3 p-4 pt-0">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <DrawerClose asChild key={action.label}>
                  <button
                    type="button"
                    onClick={() => toast(action.hint)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-4 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <span className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="size-5" />
                    </span>
                    {action.label}
                  </button>
                </DrawerClose>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
