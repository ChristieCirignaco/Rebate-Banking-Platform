import type { Metadata } from "next";

import { LegalForm } from "@/components/admin/settings/legal-form";
import { getClientSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Legal & Social" };

export default async function LegalSettingsPage() {
  const { values } = await getClientSettings("legal");

  return <LegalForm initial={values} />;
}
