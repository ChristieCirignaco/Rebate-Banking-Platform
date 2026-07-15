import type { ReactNode } from "react";

import { requireActiveUser } from "@/lib/auth-guards";
import { BottomTabBar } from "@/components/app/bottom-tab-bar";
import { DesktopSidebar } from "@/components/app/desktop-sidebar";
import { DesktopTopBar } from "@/components/app/desktop-topbar";

// Shell for the whole authenticated user area. The full gate runs once here — valid session,
// non-admin, active status, email-OTP cleared. The chrome is responsive by CSS (no JS flash):
// at lg+ a fixed sidebar + top bar; below lg the mobile bottom tab bar. `children` is rendered
// once — each page renders its own mobile + desktop composition from the same fetched data.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session } = await requireActiveUser();
  const user = {
    name: session.user.name ?? "there",
    email: session.user.email ?? "",
    image: session.user.image,
  };

  return (
    <div className="min-h-svh bg-slate-50 lg:flex dark:bg-slate-950">
      <DesktopSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopBar name={user.name} />
        <main className="flex-1">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  );
}
