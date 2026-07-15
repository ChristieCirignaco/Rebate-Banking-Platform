import type { ReactNode } from "react";
import { Landmark } from "lucide-react";

// Shared chrome for the auth pages (user + admin login, and later register / reset): a
// navy radial-gradient backdrop with a soft center glow, a rounded branded card, and an
// optional footer below it. `logoUrl` renders the admin-configured Branding logo when set;
// otherwise a default brand mark is shown.
export function AuthShell({
  logoUrl,
  children,
  footer,
}: {
  logoUrl?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 50% 42%, #d5deef 0%, #6273a7 46%, #2b3a63 100%)",
      }}
    >
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-white/50 bg-gradient-to-b from-white to-slate-50 p-6 shadow-2xl sm:p-10 dark:border-white/10 dark:from-slate-900 dark:to-slate-950">
          <div className="mb-6 flex flex-col items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-11 object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
                  <Landmark className="size-6" />
                </div>
                <span className="text-xs font-semibold tracking-widest text-slate-600 dark:text-slate-300">
                  REBATE BANK
                </span>
              </div>
            )}
          </div>
          {children}
        </div>
        {footer ? (
          <div className="mt-8 text-center text-sm text-white/90 drop-shadow-sm">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
