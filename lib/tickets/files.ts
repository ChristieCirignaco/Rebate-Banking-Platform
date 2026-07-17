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

// What the upload route hands back — structurally the TicketAttachmentInput the actions take.
// Declared here rather than imported from the actions module: that one is "use server", and
// files.ts is imported by it, so importing back would be circular. Only the shape matters.
export type UploadedTicketFile = {
  name: string;
  key: string;
  url: string;
  contentType: string;
  size?: number;
  token?: string;
};

// Client-side: upload one attachment and get back the object the ticket actions expect.
// Shared by the new-ticket dialog and the reply composer so the two can't drift — the same
// copy-paste that left three components each hardcoding their own size limit.
export async function uploadTicketAttachment(
  file: File,
): Promise<{ ok: true; file: UploadedTicketFile } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/user/tickets/upload", { method: "POST", body: form });
  } catch {
    return { ok: false, error: "Network error during upload." };
  }

  const data = (await res.json().catch(() => null)) as
    | (Partial<UploadedTicketFile> & { ok?: boolean; error?: string })
    | null;
  if (!res.ok || !data?.ok || !data.url) {
    return { ok: false, error: data?.error ?? "Couldn't upload the file." };
  }
  return {
    ok: true,
    file: {
      name: data.name ?? file.name,
      key: data.key ?? "",
      url: data.url,
      contentType: data.contentType ?? file.type,
      size: data.size,
      token: data.token,
    },
  };
}
