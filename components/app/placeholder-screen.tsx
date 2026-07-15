import type { LucideIcon } from "lucide-react";

function Inner({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <Icon className="size-7" />
      </span>
      <p className="text-lg font-semibold text-slate-900 dark:text-white">{title} is coming soon</p>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

// A "coming soon" tab screen. Mobile: centered on the light flow. Desktop: a dark-scoped card
// inside the dark content panel (so it matches the rest of the desktop shell).
export function PlaceholderScreen({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <>
      {/* Mobile */}
      <div className="flex min-h-svh items-center justify-center pb-28 lg:hidden">
        <Inner title={title} description={description} icon={icon} />
      </div>

      {/* Desktop */}
      <div className="dark hidden lg:block">
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Inner title={title} description={description} icon={icon} />
        </div>
      </div>
    </>
  );
}
