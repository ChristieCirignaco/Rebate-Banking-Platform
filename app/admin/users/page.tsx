import type { Metadata } from "next";
import { Lock, UserPlus } from "lucide-react";

import { AdminSection } from "@/components/admin/admin-section";
import { UsersView } from "@/components/admin/users/users-view";
import { mockUsers } from "@/components/admin/users/mock-data";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <AdminSection
      title="Users List"
      description="Manage accounts, roles, KYC, and access."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Lock className="size-4" />
            Create Activation Code
          </Button>
          <Button>
            <UserPlus className="size-4" />
            Add New User
          </Button>
        </div>
      }
    >
      <UsersView users={mockUsers} />
    </AdminSection>
  );
}
