"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "General", href: "/admin/settings/general" },
  { label: "Branding", href: "/admin/settings/branding" },
  { label: "Feature Flags", href: "/admin/settings/feature-flags" },
  { label: "Plugins", href: "/admin/settings/plugins" },
  { label: "Security", href: "/admin/settings/security" },
  { label: "Limits & Compliance", href: "/admin/settings/limits" },
  { label: "Legal & Social", href: "/admin/settings/legal" },
] as const;

// Route-based tab bar — each tab is its own child page of /admin/settings (deep-linkable,
// back-button works). Mirrors components/ui/tabs.tsx styling so it reads as a tab bar.
export function SettingsTabsNav() {
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
                "relative inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 py-0.5 text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "bg-background text-foreground shadow-sm dark:bg-input/30 dark:text-foreground"
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
