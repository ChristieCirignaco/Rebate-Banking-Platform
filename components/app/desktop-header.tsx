import { Landmark } from "lucide-react";

import { greetingForDate } from "@/lib/dashboard/transactions";
import { AvatarMenu } from "@/components/app/avatar-menu";
import { NotificationBell } from "@/components/app/notifications/notification-bell";
import { LanguageDropdown } from "@/components/app/translate/language-dropdown";
import { TransactionSearch } from "@/components/app/search/transaction-search";
import { ThemeToggle } from "@/components/app/theme-toggle";

// Desktop-only full-width header (shown at lg+) that spans the very top over BOTH the sidebar
// and the content. Left segment (aligned to the sidebar width) holds the brand; the rest holds
// the greeting + search / notifications / profile. Sits on the page background; never scrolls.
export function DesktopHeader({
  name,
  email,
  image,
  brandName,
  logoUrl,
}: {
  name: string;
  email: string;
  image: string | null | undefined;
  /** General → brand name. Was hardcoded "Rebate Bank", so renaming the site in Settings left
   *  the old name sitting in the app header. */
  brandName: string;
  /** Branding → logo. Shown instead of the mark + wordmark when one is configured. */
  logoUrl?: string | null;
}) {
  return (
    <header className="hidden h-20 shrink-0 items-center gap-3 px-3 lg:flex">
      {/* Brand — aligned over the sidebar */}
      <div className="flex w-56 shrink-0 items-center gap-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={brandName} className="h-9 object-contain" />
        ) : (
          <>
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Landmark className="size-5" />
            </span>
            <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {brandName}
            </span>
          </>
        )}
      </div>

      {/* Greeting + controls — over the content */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {greetingForDate()},
          </p>
          {/* The user's own name is PII — never send it to the translator. */}
          <p
            translate="no"
            className="notranslate truncate text-xl font-bold text-slate-900 dark:text-white"
          >
            {name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Renders both triggers itself: the wide pill at xl+, the icon button below it. */}
          <TransactionSearch variant="header" />
          <ThemeToggle className="relative inline-flex size-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" />
          <LanguageDropdown triggerClassName="bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" />
          <NotificationBell variant="surface" />
          <AvatarMenu
            name={name}
            email={email}
            image={image}
            align="right"
            size={32}
            triggerRingClassName="ring-2 ring-slate-200 dark:ring-slate-700"
          />
        </div>
      </div>
    </header>
  );
}
