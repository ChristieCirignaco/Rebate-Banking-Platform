import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { PendingApprovalsView } from "@/components/admin/users/pending-approvals-view";
import { getPendingApprovals } from "@/lib/admin/pending-approvals";

export const metadata: Metadata = { title: "Pending Approvals" };

// Access is enforced by the admin layout (getAdminSession). The queue lists regular users
// whose registration is awaiting manual approval; the mutating actions re-guard themselves.
export default async function PendingApprovalsPage() {
  const data = await getPendingApprovals();

  const description =
    data.readyCount > 0
      ? `${data.readyCount} ready to approve${data.awaitingCount ? ` · ${data.awaitingCount} awaiting email verification` : ""}.`
      : "New registrations awaiting review.";

  return (
    <AdminSection title="Pending Approvals" description={description}>
      <PendingApprovalsView data={data} />
    </AdminSection>
  );
}
