import type { CSSProperties, ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";

// Admin uses the shadcn dashboard-01 shell (inset sidebar + site header). The user
// and marketing surfaces use bespoke modern Tailwind instead — see design spec §13.
//
// Real enforcement lives here (the proxy only checks cookie presence): require a
// valid session AND the admin role before rendering anything under /admin.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login?redirect=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  const adminUser = { name: session.user.name, email: session.user.email };

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
    </SidebarProvider>
  );
}
