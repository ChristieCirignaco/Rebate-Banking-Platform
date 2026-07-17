import type { Metadata } from "next";

import { AppearanceForm } from "@/components/admin/profile/appearance-form";

export const metadata: Metadata = { title: "Appearance" };

export default function AdminProfileAppearancePage() {
  return <AppearanceForm />;
}
