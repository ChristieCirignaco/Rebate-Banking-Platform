import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toTicketDetail } from "@/lib/tickets/present";
import type {
  TicketDetail,
  TicketListParams,
  TicketListResult,
  TicketPriority,
  TicketStatus,
} from "@/components/admin/support-tickets/types";

export const TICKET_PAGE_SIZE = 10;

// Server-paginated, filtered ticket list — shared by all four list pages. `statuses`
// fixes the tab's status set (e.g. ["open","replied"] for "In Progress"); omit it for
// the "All Ticket" page. Also returns the live pending count for the tab/sidebar badge.
export async function getTicketList(
  params: TicketListParams = {},
): Promise<TicketListResult> {
  const rawPageSize = params.pageSize ?? TICKET_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), 100)
      : TICKET_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);
  const search = params.search?.trim();

  const createdAt: Prisma.DateTimeFilter = {};
  if (params.from) createdAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  if (params.to) createdAt.lte = new Date(`${params.to}T23:59:59.999Z`);

  const where: Prisma.TicketWhereInput = {
    ...(params.statuses?.length ? { status: { in: params.statuses } } : {}),
    ...(params.from || params.to ? { createdAt } : {}),
    ...(search
      ? {
          OR: [
            { ticketCode: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, pendingCount] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { status: "pending" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.ticket.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      category: { select: { name: true } },
    },
    // id tiebreaker keeps paging stable when timestamps tie.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    rows: rows.map((row) => ({
      id: row.id,
      ticketCode: row.ticketCode,
      subject: row.subject,
      user: {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        avatarUrl: row.user.image ?? undefined,
      },
      priority: row.priority as TicketPriority,
      status: row.status as TicketStatus,
      categoryName: row.category?.name ?? row.categoryName ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
    pendingCount,
  };
}

export async function getTicketDetail(id: string): Promise<TicketDetail | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      category: { select: { name: true } },
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!ticket) return null;
  return toTicketDetail(ticket);
}
