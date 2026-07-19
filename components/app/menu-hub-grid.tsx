"use client";

import Link from "next/link";

import { visibleNav } from "@/components/app/app-nav";

// The hub's contents: every feature the user can reach, as a grid of icon tiles. Split out of
// menu-hub.tsx so it can be a lazily-loaded chunk — the whole nav table plus its icon set is
// dead weight in the dashboard's initial bundle when most visits never open the hub. That split
// is also what makes the hub's skeleton a real loading state rather than decoration.
//
// Flag-filtered through visibleNav, the same helper the sidebar, drawer and bottom bar use, so
// a feature switched off in admin can't leave a tile here that walks the user into a redirect.
export function MenuHubGrid({
  enabled,
  onNavigate,
}: {
  enabled: string[];
  onNavigate: () => void;
}) {
  const nav = visibleNav(enabled);

  return (
    <div className="grid grid-cols-4 gap-2">
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-3 text-center transition-colors active:bg-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800 dark:hover:bg-slate-900"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Icon className="size-5" />
            </span>
            {/* Labels vary in length ("KYC" vs "Request Money"); leading-tight + two lines keeps
                every tile the same height so the grid stays even. */}
            <span className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-700 dark:text-slate-200">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
