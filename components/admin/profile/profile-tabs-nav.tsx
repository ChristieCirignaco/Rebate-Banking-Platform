"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "Profile", href: "/admin/profile" },
  { label: "Security", href: "/admin/profile/security" },
  { label: "Appearance", href: "/admin/profile/appearance" },
  { label: "Preferences", href: "/admin/profile/preferences" },
] as const;

// Route-based tab bar for /admin/profile/* — each tab is its own child page (deep-linkable,
// back-button works). Mirrors the Settings tab bar so the two read identically.
export function ProfileTabsNav() {
  const pathname = usePathname();

  return (
    <div className="-mb-2 w-full overflow-x-auto pb-2">
      <div className="bg-muted text-muted-foreground inline-flex h-8 w-max items-center justify-center gap-1 rounded-lg p-[3px]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 py-0.5 text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "bg-background text-foreground dark:bg-input/30 dark:text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
