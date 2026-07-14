import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { TicketTabsNav } from "@/components/admin/support-tickets/ticket-tabs-nav";
import { TicketsView } from "@/components/admin/support-tickets/tickets-view";
import { getTicketList } from "@/lib/admin/support-tickets";

export const metadata: Metadata = { title: "Pending Tickets" };

export default async function PendingTicketsPage() {
  const initial = await getTicketList({ statuses: ["pending"] });

  return (
    <AdminSection
      title="Pending Ticket"
      description="Tickets waiting for a first response."
    >
      <TicketTabsNav pendingCount={initial.pendingCount} />
      <TicketsView
        initial={initial}
        fixedStatuses={["pending"]}
        emptyMessage="No pending tickets."
      />
    </AdminSection>
  );
}
