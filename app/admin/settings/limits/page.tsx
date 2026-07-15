import type { Metadata } from "next";

import { LimitsForm } from "@/components/admin/settings/limits-form";
import { getClientSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Limits & Compliance" };

export default async function LimitsSettingsPage() {
  const { values } = await getClientSettings("limits");

  return <LimitsForm initial={values} />;
}
