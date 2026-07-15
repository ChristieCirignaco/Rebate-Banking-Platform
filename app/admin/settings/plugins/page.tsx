import type { Metadata } from "next";

import { PluginsForm } from "@/components/admin/settings/plugins-form";
import { getClientSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Plugins" };

export default async function PluginsSettingsPage() {
  const { values, secretsSet } = await getClientSettings("plugins");
  return <PluginsForm initial={values} secretsSet={secretsSet} />;
}
