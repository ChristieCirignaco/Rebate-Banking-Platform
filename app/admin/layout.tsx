import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";
import { ScreenLock } from "@/components/admin/settings/screen-lock";
import { SiteHeader } from "@/components/site-header";
import { UserSignOutButton } from "@/components/user-sign-out-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAdminSession, getSession, isAdminTierRole } from "@/lib/auth-guards";
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
// Admin browser-tab title comes from System Settings (brand name), scoped to /admin so it
// doesn't affect the marketing or user surfaces (which set their own).
export async function generateMetadata(): Promise<Metadata> {
  const general = await getSettings("general");
  const brand = general.brandName || general.siteTitle || "Rebate Bank";
  return { title: { default: brand, template: `%s · ${brand}` } };
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // The admin login lives under /admin but is public and renders standalone — no auth gate,
  // no sidebar chrome. proxy.ts tags the path so we can branch here without a pathname hook.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/admin/login") {
    return children;
  }

  const session = await getSession();
  if (!session) {
    redirect("/admin/login?redirect=/admin");
  }
  if (!(await getAdminSession())) {
    // An admin-tier account that isn't active (suspended/pending) must NOT bounce to
    // /dashboard — that page sends admin-tier users back to /admin, which would loop. Show a
    // terminal notice instead. A genuine non-admin (regular user) goes to their own area.
    if (isAdminTierRole(session.user.role)) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-xl font-semibold">Account not active</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Your admin account is suspended or pending. Contact a super administrator to
              restore access.
            </p>
          </div>
          <UserSignOutButton />
        </div>
      );
    }
    redirect("/dashboard");
  }

  const adminUser = { name: session.user.name, email: session.user.email };
  const [security, branding, general] = await Promise.all([
    getSettings("security"),
    getSettings("branding"),
    getSettings("general"),
  ]);

  return (
    <AdminThemeProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          user={adminUser}
          branding={{
            logoLight: branding.logoLight,
            logoDark: branding.logoDark,
            brandName: general.brandName,
          }}
        />
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
    </AdminThemeProvider>
  );
}
