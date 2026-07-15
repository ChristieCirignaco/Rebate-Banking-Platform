import { Bell, Search } from "lucide-react";

import { greetingForDate } from "@/lib/dashboard/transactions";
import { ComingSoonButton } from "@/components/app/coming-soon-button";

const ICON_BTN =
  "relative flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

// Desktop-only top bar (shown at lg+): a greeting on the left, search + notifications on the
// right. Sticky under the viewport top, above the scrolling content.
export function DesktopTopBar({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-950/80">
      <div className="leading-tight">
        <p className="text-xs text-slate-500 dark:text-slate-400">{greetingForDate()},</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{name}</p>
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
      </div>
    </header>
  );
}
