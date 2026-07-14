import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { TicketTabsNav } from "@/components/admin/support-tickets/ticket-tabs-nav";
import { TicketsView } from "@/components/admin/support-tickets/tickets-view";
import { getTicketList } from "@/lib/admin/support-tickets";

export const metadata: Metadata = { title: "All Tickets" };

export default async function AllTicketsPage() {
  const initial = await getTicketList();

  return (
    <AdminSection title="All Ticket" description="Every support ticket on the platform.">
      <TicketTabsNav pendingCount={initial.pendingCount} />
      <TicketsView initial={initial} showStatusFilter emptyMessage="No tickets match your filters." />
    </AdminSection>
  );
}
