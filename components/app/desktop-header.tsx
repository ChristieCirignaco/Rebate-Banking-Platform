import { Bell, Landmark, Search } from "lucide-react";

import { greetingForDate } from "@/lib/dashboard/transactions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ComingSoonButton } from "@/components/app/coming-soon-button";

const ICON_BTN =
  "relative flex size-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "U";
}

// Desktop-only full-width header (shown at lg+) that spans the very top over BOTH the sidebar
// and the content. Left segment (aligned to the sidebar width) holds the brand; the rest holds
// the greeting + search / notifications / profile. Sits on the page background; never scrolls.
export function DesktopHeader({ name, image }: { name: string; image: string | null | undefined }) {
  return (
    <header className="hidden h-20 shrink-0 items-center gap-3 px-3 lg:flex">
      {/* Brand — aligned over the sidebar */}
      <div className="flex w-56 shrink-0 items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
          <Landmark className="size-5" />
        </span>
        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          Rebate Bank
        </span>
      </div>

      {/* Greeting + controls — over the content */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-slate-500 dark:text-slate-400">{greetingForDate()},</p>
          <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{name}</p>
        </div>
        <div className="flex items-center gap-2">
          <ComingSoonButton
            ariaLabel="Search"
            message="Search is coming soon."
            className="hidden h-10 w-56 items-center gap-2 rounded-full bg-white px-4 text-sm text-slate-400 shadow-sm transition-colors hover:bg-slate-100 xl:flex dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Search className="size-4 shrink-0" />
            <span>Search…</span>
          </ComingSoonButton>
          <ComingSoonButton
            ariaLabel="Search"
            message="Search is coming soon."
            className={`xl:hidden ${ICON_BTN}`}
          >
            <Search className="size-5" />
          </ComingSoonButton>
          <ComingSoonButton
            ariaLabel="Notifications"
            message="Notifications are coming soon."
            className={ICON_BTN}
          >
            <Bell className="size-5" />
          </ComingSoonButton>
          <Avatar size="default" className="ring-2 ring-slate-200 dark:ring-slate-700">
            {image ? <AvatarImage src={image} alt={name} /> : null}
            <AvatarFallback className="bg-blue-600 text-xs font-semibold text-white">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
