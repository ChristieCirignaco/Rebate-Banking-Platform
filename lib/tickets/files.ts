// Allowlist + helpers for ticket-reply attachments, shared by the upload route, the
// serving route, and the data layer. Mirrors lib/kyc/files.ts. SVG is deliberately
// excluded — inline SVG can carry script.
export const TICKET_FILE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export const MAX_TICKET_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const TICKET_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf";

export function extForContentType(contentType: string): string | null {
  const match = Object.entries(TICKET_FILE_TYPES).find(([, ct]) => ct === contentType);
  return match ? match[0] : null;
}

export function contentTypeForKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return TICKET_FILE_TYPES[ext] ?? null;
}

export function isImageContentType(contentType: string | null | undefined): boolean {
  return !!contentType && contentType.startsWith("image/");
}

export function keyBasename(key: string): string {
  return key.split("/").pop() ?? key;
}

// The access-controlled URL a client uses to fetch a stored ticket attachment.
export function ticketAttachmentUrl(key: string): string {
  return `/api/ticket-attachments/${keyBasename(key)}`;
}
