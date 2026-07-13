import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <AdminSection
      title="Settings"
      description="Operational thresholds and limits."
    >
      <PlaceholderPanel>App settings land in later phases.</PlaceholderPanel>
    </AdminSection>
  );
}
