import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { RequestsView } from "@/components/admin/requests/requests-view";
import { getPendingRequests, getRequestHistory } from "@/lib/admin/requests";

export const metadata: Metadata = { title: "Money Requests" };

export default async function AdminRequestsPage() {
  const [pending, history] = await Promise.all([getPendingRequests(), getRequestHistory()]);

  return (
    <AdminSection
      title="Money Requests"
      description="Review users' requests to credit their wallet — approve to credit, or reject."
    >
      <RequestsView pending={pending} history={history} />
    </AdminSection>
  );
}
