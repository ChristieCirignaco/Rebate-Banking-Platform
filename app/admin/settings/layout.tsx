import type { ReactNode } from "react";

import { SettingsTabsNav } from "@/components/admin/settings/settings-tabs-nav";

// Shared chrome for every /admin/settings/* tab: the title + the routed tab bar. Each
// child page renders only its own form body.
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage site configuration, branding, integrations, and policies.
        </p>
      </div>
      <SettingsTabsNav />
      {children}
    </div>
  );
}
