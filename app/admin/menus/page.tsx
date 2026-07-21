import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { MenusView } from "@/components/admin/menus/menus-view";
import { getMenuManagerData } from "@/lib/admin/menus";

export const metadata: Metadata = { title: "Menus" };

export default async function AdminMenusPage() {
  const data = await getMenuManagerData();
  return (
    <AdminSection
      title="Menus"
      description="Arrange the header menu and footer quick links. Add pages or custom links to each location."
    >
      <MenusView data={data} />
    </AdminSection>
  );
}
