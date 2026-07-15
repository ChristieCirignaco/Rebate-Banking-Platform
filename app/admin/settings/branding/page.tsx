import type { Metadata } from "next";

import { BrandingForm } from "@/components/admin/settings/branding-form";
import { getClientSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingSettingsPage() {
  const { values } = await getClientSettings("branding");

  return <BrandingForm initial={values} />;
}
