import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Operational thresholds and limits."
      />
      <PlaceholderPanel>App settings land in later phases.</PlaceholderPanel>
    </>
  );
}
