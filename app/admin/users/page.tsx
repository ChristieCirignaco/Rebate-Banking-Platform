import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Manage accounts, statuses, and roles."
      />
      <PlaceholderPanel>User management lands in Phase 1.</PlaceholderPanel>
    </>
  );
}
