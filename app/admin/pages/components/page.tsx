import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { ComponentsView } from "@/components/admin/pages/components-view";
import { CreateComponentDialog } from "@/components/admin/pages/create-component-dialog";
import { getCmsComponentsList } from "@/lib/admin/cms";

export const metadata: Metadata = { title: "Page Components" };

export default async function AdminPageComponentsPage() {
  const components = await getCmsComponentsList();
  return (
    <AdminSection
      title="Page Components"
      description="Reusable sections shared across pages — edit once, updated everywhere."
      actions={<CreateComponentDialog />}
    >
      <ComponentsView components={components} />
    </AdminSection>
  );
}
