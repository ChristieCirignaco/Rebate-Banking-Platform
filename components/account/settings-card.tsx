import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// The app's card for account settings sections (profile, password, PIN, 2FA). Replaces the raw
// shadcn <Card> those forms used, so they read in the app's slate/blue language — rounded-2xl,
// slate borders, a blue-accent icon chip — instead of the generic shadcn look. Optional header:
// pass a title (and icon/description) for a titled section, or omit it for a bare card.
export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {title ? (
        <div className="mb-4 flex items-center gap-2.5">
          {Icon ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Icon className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}
