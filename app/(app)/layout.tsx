import type { ReactNode } from "react";

import { requireActiveUser } from "@/lib/auth-guards";
import { getEnabledFlags } from "@/lib/settings/feature-flags";
import { BottomTabBar } from "@/components/app/bottom-tab-bar";
import { DesktopSidebar } from "@/components/app/desktop-sidebar";
import { DesktopHeader } from "@/components/app/desktop-header";

// Shell for the whole authenticated user area. Full gate runs once here.
//
// Desktop (lg+) is a fixed shadcn-style app frame — no page scroll. A full-width header spans
// the very top (over both the sidebar and the content); below it sit the detached dark sidebar
// and the light main container, which wraps the dark content panel — the ONLY scroller. Below
// lg the lg: utilities are inert, so the mobile phone-hero flow + bottom tab bar are untouched.
// `children` renders once; each page provides its mobile + desktop view.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session } = await requireActiveUser();
  // One batched read for the whole shell — the nav asks about a dozen flags, and each page
  // re-checks its own (React cache makes that the same round-trip). Only the keys cross into
  // the client components; the nav itself can't (its icons are React components).
  const enabled = [...(await getEnabledFlags())];
  const user = {
    name: session.user.name ?? "there",
    email: session.user.email ?? "",
    image: session.user.image,
  };

  return (
    <>
      {/* Lift the live-chat launcher above the mobile bottom nav. The chat widget floats
          site-wide (SitePluginScripts), but only the signed-in app has a bottom tab bar, and the
          vendor bubble sits at bottom:24px right:12px — directly over it. This style is present
          only while an app page is mounted (so marketing/auth keep the bubble at its default
          spot) and only applies below lg, where the tab bar exists. The offset clears the bar
          plus the device's safe-area inset, matching the bar's own bottom padding.
          Selector is Smartsupp's launcher frame; add other vendors' launcher selectors here if
          the configured provider changes. */}
      <style>{`
        @media (max-width: 1023.98px) {
          div[data-testid="widgetButtonFrame"] {
            bottom: calc(70px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      <div className="min-h-svh bg-white lg:flex lg:h-svh lg:flex-col lg:overflow-hidden lg:bg-slate-200 dark:bg-slate-950 dark:lg:bg-black">
        {/* Full-width header across the top — over both sidebar and content */}
        <DesktopHeader name={user.name} image={user.image} />

        {/* Body: detached sidebar + main container, below the header */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-3 lg:p-3 lg:pt-0">
          <DesktopSidebar user={user} enabled={enabled} />

          {/* Main container (light card) — does NOT scroll; wraps the dark content panel */}
          <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:rounded-2xl lg:bg-[#f8fafc] lg:p-3 lg:shadow-sm dark:lg:bg-slate-900">
            {/* Dark content area — the only scrollable region on desktop; subtle scrollbar */}
            <div className="lg:min-h-0 lg:flex-1 lg:[scrollbar-width:thin] lg:[scrollbar-color:#334155_transparent] lg:overflow-y-auto lg:rounded-2xl lg:bg-[#0b1120] lg:p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
              {children}
            </div>
          </div>
        </div>

        <BottomTabBar enabled={enabled} user={user} />
      </div>
    </>
  );
}
