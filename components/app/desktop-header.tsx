import { Bell, Search } from "lucide-react";

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

// Desktop-only header (shown at lg+), fixed at the top of the light main container — greeting
// + name on the left, search / notifications / profile on the right. Never scrolls (the dark
// content panel below it is the only scroller).
export function DesktopHeader({ name, image }: { name: string; image: string | null | undefined }) {
  return (
    <header className="hidden h-20 shrink-0 items-center justify-between px-3 lg:flex">
      <div className="leading-tight">
        <p className="text-xs text-slate-500 dark:text-slate-400">{greetingForDate()},</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{name}</p>
      </div>
      <div className="flex items-center gap-2">
        <ComingSoonButton ariaLabel="Search" message="Search is coming soon." className={ICON_BTN}>
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
    </header>
  );
}
