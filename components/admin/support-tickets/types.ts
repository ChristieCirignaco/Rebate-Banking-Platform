// Shared types for the Support Ticket admin feature.

export type TicketStatus = "open" | "pending" | "replied" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketSenderType = "user" | "admin";

export interface TicketUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TicketAttachmentView {
  name: string;
  key: string;
  url: string;
  contentType: string;
  size?: number;
  isImage: boolean;
}

// A row in one of the four list pages.
export interface TicketListItem {
  id: string;
  ticketCode: string;
  subject: string;
  user: TicketUserSummary;
  priority: TicketPriority;
  status: TicketStatus;
  categoryName: string | null;
  createdAt: string; // ISO — "opening time"
}

export interface TicketListResult {
  rows: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pendingCount: number; // for the sidebar/tab badge
}

export interface TicketListParams {
  // undefined = every status ("All Ticket"); otherwise the exact set for that tab.
  statuses?: TicketStatus[];
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface TicketMessageView {
  id: string;
  senderType: TicketSenderType;
  senderName: string;
  body: string;
  attachments: TicketAttachmentView[];
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  ticketCode: string;
  subject: string;
  body: string;
  priority: TicketPriority;
  status: TicketStatus;
  categoryName: string | null;
  user: TicketUserSummary;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessageView[];
}

export interface ReplyAttachmentInput {
  name: string;
  key: string;
  url: string;
  contentType: string;
  size?: number;
}

export interface ReplyPayload {
  message: string;
  attachments?: ReplyAttachmentInput[];
}
