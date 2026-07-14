import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { TicketTabsNav } from "@/components/admin/support-tickets/ticket-tabs-nav";
import { TicketsView } from "@/components/admin/support-tickets/tickets-view";
import { getTicketList } from "@/lib/admin/support-tickets";

export const metadata: Metadata = { title: "In Progress Tickets" };

const IN_PROGRESS_STATUSES = ["open", "replied"] as const;

export default async function InProgressTicketsPage() {
  const initial = await getTicketList({ statuses: [...IN_PROGRESS_STATUSES] });

  return (
    <AdminSection
      title="In Progress Ticket"
      description="Tickets actively being worked — open or already replied to."
    >
      <TicketTabsNav pendingCount={initial.pendingCount} />
      <TicketsView
        initial={initial}
        fixedStatuses={[...IN_PROGRESS_STATUSES]}
        emptyMessage="No tickets in progress."
      />
    </AdminSection>
  );
}
