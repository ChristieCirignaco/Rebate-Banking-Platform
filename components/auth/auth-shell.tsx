import type { ReactNode } from "react";
import { Landmark, Loader2 } from "lucide-react";

// Reference-style auth input: taller, more rounded, subtle fill, blue focus. Shared across
// every auth form so login / reset / verify / OTP fields look identical.
export const AUTH_FIELD_CLASS =
  "h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/40 dark:focus-visible:bg-slate-800";

// shadcn's SelectTrigger sets its height via `data-[size=default]:h-8`, which out-specifies a
// plain `h-12` — so a Select rendered with AUTH_FIELD_CLASS ends up shorter than the inputs.
// This forces the same 48px height (and full width) with `!h-12` so selects line up with the
// text fields. Use on every auth-form Select trigger.
export const AUTH_SELECT_TRIGGER_CLASS =
  "!h-12 w-full rounded-xl border-slate-200 bg-slate-50/70 px-4 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/40 dark:focus-visible:bg-slate-800";

// The shared blue→indigo gradient submit button used on every auth form.
export function AuthSubmitButton({
  loading,
  children,
  loadingLabel = "Please wait…",
  disabled,
}: {
  loading: boolean;
  children: ReactNode;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

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
