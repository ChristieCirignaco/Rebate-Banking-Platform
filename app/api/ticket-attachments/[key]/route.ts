import { getAdminSession, getSession } from "@/lib/auth-guards";
import { getObject } from "@/lib/storage";
import { userOwnsTicketAttachment } from "@/lib/support";
import { contentTypeForKey } from "@/lib/tickets/files";

type Ctx = { params: Promise<{ key: string }> };

// GET /api/ticket-attachments/[key] — stream a stored ticket attachment. Never public: an admin
// may read any; a regular user may read only attachments in their OWN tickets' threads.
// Mirrors /api/kyc-documents/[key]; `?download=1` forces an attachment.
export async function GET(request: Request, { params }: Ctx) {
  const { key } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  if (!(await getAdminSession())) {
    const session = await getSession();
    if (!session || !(await userOwnsTicketAttachment(session.user.id, key))) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const contentType = contentTypeForKey(key);
  if (!contentType) return new Response("Not found", { status: 404 });

  const bytes = await getObject(`tickets/${key}`);
  if (!bytes) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${key}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
