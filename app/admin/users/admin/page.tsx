import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { AdminsTable } from "@/components/admin/admins/admins-table";
import { getAdminSession } from "@/lib/auth-guards";
import { getAdminAccounts } from "@/lib/admin/admins";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminAccountsPage() {
  const [session, admins] = await Promise.all([getAdminSession(), getAdminAccounts()]);
  const canManage = session?.user.role === "super_admin";

  return (
    <AdminSection
      title="Admins"
      description={
        canManage
          ? "Manage admin accounts — edit info, deactivate, or reactivate."
          : "Admin accounts on the platform. Only a Super Admin can edit or deactivate them."
      }
    >
      <AdminsTable admins={admins} canManage={canManage} />
    </AdminSection>
  );
}
