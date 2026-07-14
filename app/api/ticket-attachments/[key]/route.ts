import { getAdminSession } from "@/lib/auth-guards";
import { getObject } from "@/lib/storage";
import { contentTypeForKey } from "@/lib/tickets/files";

type Ctx = { params: Promise<{ key: string }> };

// GET /api/ticket-attachments/[key] — stream a stored ticket attachment to an admin only.
// Mirrors /api/kyc-documents/[key]: never public, `?download=1` forces an attachment.
export async function GET(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
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
