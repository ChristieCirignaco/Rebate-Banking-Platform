import { getAdminSession, getSession } from "@/lib/auth-guards";
import { getObject } from "@/lib/storage";
import { userOwnsKycDocument } from "@/lib/kyc";
import { contentTypeForKey } from "@/lib/kyc/files";

type Ctx = { params: Promise<{ key: string }> };

// GET /api/kyc-documents/[key] — stream a stored KYC document. These are sensitive identity
// files, so they are never public: this route is the only way to read them. An admin may read
// any; a regular user may read only documents in their OWN submission. Mirrors the guard in
// /api/ticket-attachments/[key]; `?download=1` forces an attachment disposition.
export async function GET(request: Request, { params }: Ctx) {
  const { key } = await params;
  // Opaque filename only — reject path separators / traversal before touching storage.
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  if (!(await getAdminSession())) {
    const session = await getSession();
    if (!session || !(await userOwnsKycDocument(session.user.id, key))) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const contentType = contentTypeForKey(key);
  if (!contentType) return new Response("Not found", { status: 404 });

  const bytes = await getObject(`kyc/${key}`);
  if (!bytes) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${key}"`,
      // Neutralize any active content embedded in a document; block MIME sniffing.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
