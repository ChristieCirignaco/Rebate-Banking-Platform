import type { ReactNode } from "react";

import { requireActiveUser } from "@/lib/auth-guards";
import { BottomTabBar } from "@/components/app/bottom-tab-bar";
import { DesktopSidebar } from "@/components/app/desktop-sidebar";
import { DesktopHeader } from "@/components/app/desktop-header";

// Shell for the whole authenticated user area. Full gate runs once here.
//
// Desktop (lg+) is a fixed shadcn-style app frame — no page scroll: a detached dark sidebar,
// a light main container holding a fixed header, and a dark content panel that is the ONLY
// scroller. Below lg it collapses to the mobile phone-hero flow with the bottom tab bar (the
// lg: utilities are inert, so the mobile view is untouched). `children` renders once; each
// page provides its own mobile + desktop composition.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session } = await requireActiveUser();
  const user = {
    name: session.user.name ?? "there",
    email: session.user.email ?? "",
    image: session.user.image,
  };

  return (
    <div className="min-h-svh bg-white lg:flex lg:h-svh lg:gap-3 lg:overflow-hidden lg:bg-slate-200 lg:p-3 dark:bg-slate-950 dark:lg:bg-black">
      <DesktopSidebar user={user} />

      {/* Light main container (fixed frame): header + dark scroll panel */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:rounded-2xl lg:bg-[#f8fafc] lg:p-3 lg:shadow-sm dark:lg:bg-slate-900">
        <DesktopHeader name={user.name} image={user.image} />

        {/* Dark content area — the only scrollable region on desktop; subtle scrollbar */}
        <div className="lg:mt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-2xl lg:bg-[#0b1120] lg:p-5 lg:[scrollbar-color:#334155_transparent] lg:[scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
          {children}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
