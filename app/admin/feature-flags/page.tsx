import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Feature flags" };

export default function AdminFeatureFlagsPage() {
  return (
    <>
      <AdminPageHeader
        title="Feature flags"
        description="Toggle capabilities. Safety-critical flags fail closed when off."
      />
      <PlaceholderPanel>Flag management lands in Phase 1.</PlaceholderPanel>
    </>
  );
}
