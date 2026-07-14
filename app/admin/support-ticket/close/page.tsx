import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { TicketTabsNav } from "@/components/admin/support-tickets/ticket-tabs-nav";
import { TicketsView } from "@/components/admin/support-tickets/tickets-view";
import { getTicketList } from "@/lib/admin/support-tickets";

export const metadata: Metadata = { title: "Closed Tickets" };

export default async function ClosedTicketsPage() {
  const initial = await getTicketList({ statuses: ["closed"] });

  return (
    <AdminSection title="Close Ticket" description="Resolved and closed tickets.">
      <TicketTabsNav pendingCount={initial.pendingCount} />
      <TicketsView
        initial={initial}
        fixedStatuses={["closed"]}
        emptyMessage="No closed tickets."
      />
    </AdminSection>
  );
}
