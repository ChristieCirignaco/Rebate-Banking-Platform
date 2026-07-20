import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { CreatePageDialog } from "@/components/admin/pages/create-page-dialog";
import { PagesView } from "@/components/admin/pages/pages-view";
import { getCmsPagesList } from "@/lib/admin/cms";

export const metadata: Metadata = { title: "Page Manager" };

export default async function AdminPagesPage() {
  const pages = await getCmsPagesList();
  return (
    <AdminSection
      title="Page Manager"
      description="Compose the marketing pages from reusable components — no code changes needed."
      actions={<CreatePageDialog />}
    >
      <PagesView pages={pages} />
    </AdminSection>
  );
}
