import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <AdminSection
      title="Users"
      description="Manage accounts, statuses, and roles."
    >
      <PlaceholderPanel>User management lands in Phase 1.</PlaceholderPanel>
    </AdminSection>
  );
}
