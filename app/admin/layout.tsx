import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ScreenLock } from "@/components/admin/settings/screen-lock";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAdminSession, getSession } from "@/lib/auth-guards";
import { screenLockMs } from "@/lib/settings/defs";
import { getSettings } from "@/lib/settings/store";

// Admin uses the shadcn dashboard-01 shell (inset sidebar + site header). The user
// and marketing surfaces use bespoke modern Tailwind instead — see design spec §13.
//
// Real enforcement lives here (the proxy only checks cookie presence): require a valid
// session, an admin-tier role, and an active status before rendering anything under
// /admin. Delegates the role/status check to getAdminSession() (lib/auth-guards.ts) so
// there is exactly one place that decides "is admin" — this only branches separately
// because "no session" and "wrong role/suspended" need distinct redirect targets, which
// getAdminSession()'s single null return can't distinguish. getAdminSession() is
// request-cached, so a page that also calls it (e.g. to compute a super-admin-only view)
// reuses this same result instead of re-querying.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/admin");
  }
  if (!(await getAdminSession())) {
    redirect("/");
  }

  const adminUser = { name: session.user.name, email: session.user.email };
  const security = await getSettings("security");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" user={adminUser} />
      <SidebarInset>
        <SiteHeader />
        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          {children}
        </div>
      </SidebarInset>
      <ScreenLock
        enabled={security.screenLockEnabled}
        idleMs={screenLockMs(security.screenLockIdleValue, security.screenLockIdleUnit)}
        adminName={session.user.name}
        adminEmail={session.user.email}
      />
    </SidebarProvider>
  );
}
