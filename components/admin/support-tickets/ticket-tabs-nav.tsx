"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Pending Ticket", href: "/admin/support-ticket/pending" },
  { label: "In Progress Ticket", href: "/admin/support-ticket/inprogress" },
  { label: "Close Ticket", href: "/admin/support-ticket/close" },
  { label: "All Ticket", href: "/admin/support-ticket/history" },
] as const;

// Route-based tab bar — each "tab" is its own page (matching the sidebar submenu), not a
// client-side panel switch. Visually mirrors components/ui/tabs.tsx's TabsList/TabsTrigger
// styling so it reads as a normal tab bar despite navigating on click.
export function TicketTabsNav({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <div className="w-full overflow-x-auto pb-2 -mb-2">
      <div className="bg-muted text-muted-foreground inline-flex h-8 w-max items-center justify-center gap-1 rounded-lg p-[3px]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md px-3 py-0.5 text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "bg-background text-foreground shadow-sm dark:bg-input/30 dark:text-foreground"
                  : "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.href === "/admin/support-ticket/pending" && pendingCount ? (
                <Badge variant="secondary" className="px-1.5">
                  {pendingCount}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
