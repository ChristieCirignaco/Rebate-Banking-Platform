import type { Metadata } from "next";

import { SecurityForm } from "@/components/admin/settings/security-form";
import { getClientSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Security" };

export default async function SecuritySettingsPage() {
  const { values } = await getClientSettings("security");
  return <SecurityForm initial={values} />;
}
