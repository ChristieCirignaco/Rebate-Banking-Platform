import type { Metadata } from "next";

import { FeatureFlagsForm } from "@/components/admin/settings/feature-flags-form";
import { getFeatureFlags } from "@/lib/settings/feature-flags";

export const metadata: Metadata = { title: "Feature Flags" };

export default async function FeatureFlagsSettingsPage() {
  const flags = await getFeatureFlags();
  return <FeatureFlagsForm initial={flags} />;
}
