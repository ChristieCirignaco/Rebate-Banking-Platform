import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { BroadcastComposer } from "@/components/admin/notifications/broadcast-composer";
import { getBroadcastAudienceSize } from "@/lib/admin/notifications";

export const metadata: Metadata = { title: "Notify to Users" };

export default async function NotifyToUsersPage() {
  const audienceSize = await getBroadcastAudienceSize();

  return (
    <AdminSection
      title="Notify to Users"
      description="Broadcast a notification to all your users by email or push."
    >
      <BroadcastComposer audienceSize={audienceSize} />
    </AdminSection>
  );
}
