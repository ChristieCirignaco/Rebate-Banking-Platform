import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { UserListActions } from "@/components/admin/users/user-list-actions";
import { UsersView } from "@/components/admin/users/users-view";
import { getAdminUsers } from "@/lib/admin/users-list";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <AdminSection
      title="Users List"
      description="Manage accounts, roles, KYC, and access."
      actions={<UserListActions />}
    >
      <UsersView users={users} />
    </AdminSection>
  );
}
