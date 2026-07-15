import type { LucideIcon } from "lucide-react";

// A lightweight "coming soon" tab screen, used for the nav destinations not built yet
// (Statistic, Wallet). Keeps the bottom tab bar visible (it's a top-level tab) with room
// for it via bottom padding.
export function PlaceholderScreen({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-h-svh flex-col px-5 pb-28">
      <header className="py-4">
        <h1 className="text-center text-base font-bold text-slate-900 dark:text-white">{title}</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon className="size-7" />
        </span>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">{title} is coming soon</p>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}
