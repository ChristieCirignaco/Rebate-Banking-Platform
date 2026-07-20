import { getObject } from "@/lib/storage";
import {
  CMS_DOCUMENT_NAMESPACE,
  cmsDocumentContentTypeForKey,
  cmsDocumentKind,
} from "@/lib/cms/documents";

type Ctx = { params: Promise<{ key: string }> };

// GET /api/cms-documents/[key] — serve a PUBLIC marketing document. No auth: these are
// published on the marketing site by an admin who chose to publish them. The namespace is
// hardcoded, so this route can never reach the private "kyc" or "deposit-proofs" files.
//
// `?download=1` forces a save-as. Without it, images and PDFs render inline (that is the whole
// point of attaching them); every other type is still sent as an attachment, because a browser
// asked to display an unknown type inline is exactly where sniffing surprises live.
export async function GET(request: Request, { params }: Ctx) {
  const { key } = await params;
  // Opaque filename only — reject path separators / traversal before touching storage.
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = cmsDocumentContentTypeForKey(key);
  if (!contentType) return new Response("Not found", { status: 404 });

  const bytes = await getObject(`${CMS_DOCUMENT_NAMESPACE}/${key}`);
  if (!bytes) return new Response("Not found", { status: 404 });

  const forced = new URL(request.url).searchParams.get("download") === "1";
  const previewable = cmsDocumentKind(key) !== "file";
  const disposition = forced || !previewable ? "attachment" : "inline";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${key}"`,
      // Neutralize any active content embedded in a document and block MIME sniffing — the same
      // pair that keeps /api/media safe. Keys are immutable uuids, so the long cache is safe.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
