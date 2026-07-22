import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { UserListActions } from "@/components/admin/users/user-list-actions";
import { UsersView } from "@/components/admin/users/users-view";
import { getSuperAdminSession } from "@/lib/auth-guards";
import { getAdminUsers } from "@/lib/admin/users-list";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  // Deleting a user is super_admin-only (the action re-checks this); resolve it once here so the
  // row menu can hide the Delete entry from regular admins rather than show a control that fails.
  const [users, canDelete] = await Promise.all([
    getAdminUsers(),
    getSuperAdminSession().then(Boolean),
  ]);

  return (
    <AdminSection
      title="Users List"
      description="Manage accounts, roles, KYC, and access."
      actions={<UserListActions />}
    >
      <UsersView users={users} canDelete={canDelete} />
    </AdminSection>
  );
}
