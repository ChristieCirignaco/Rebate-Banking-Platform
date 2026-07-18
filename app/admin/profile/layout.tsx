import type { ReactNode } from "react";

import { ProfileTabsNav } from "@/components/admin/profile/profile-tabs-nav";

// Shared chrome for every /admin/profile/* tab: the title + the routed tab bar. Each child
// page renders only its own body.
export default function AdminProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal details, sign-in security, and preferences.
        </p>
      </div>
      <ProfileTabsNav />
      {children}
    </div>
  );
}
