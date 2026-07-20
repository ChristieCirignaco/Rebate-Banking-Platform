import { getAdminSession } from "@/lib/auth-guards";
import { putObject } from "@/lib/storage";
import {
  CMS_DOCUMENT_NAMESPACE,
  MAX_CMS_DOCUMENT_BYTES,
  MAX_CMS_DOCUMENT_LABEL,
  cmsDocumentExtForContentType,
  cmsDocumentUrl,
} from "@/lib/cms/documents";

// POST /api/admin/cms-documents — ingest one public marketing document (policy PDF, company
// profile, rate sheet) and return its served URL. Admin-guarded.
//
// Separate from /api/admin/media rather than an extension of it: media is capped at 2 MB and
// allows SVG because it serves brand logos, neither of which is right for documents. Keeping
// the allowlists apart means widening one can't silently widen the other.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  // Reject an oversized body before buffering it into memory. file.size below is still the
  // authoritative check — Content-Length is attacker-controlled and merely bounds the obvious case.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_CMS_DOCUMENT_BYTES + 16 * 1024) {
    return Response.json(
      { ok: false, error: `Document must be ${MAX_CMS_DOCUMENT_LABEL} or smaller.` },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  // The extension is derived from the browser-reported content type against our allowlist, never
  // from the filename — a file called "policy.pdf.html" cannot talk its way into an html key.
  const ext = cmsDocumentExtForContentType(file.type);
  if (!ext) {
    return Response.json(
      {
        ok: false,
        error:
          "Allowed: PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP, or an image (PNG, JPEG, WEBP, GIF).",
      },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_CMS_DOCUMENT_BYTES) {
    return Response.json(
      { ok: false, error: `Document must be between 1 byte and ${MAX_CMS_DOCUMENT_LABEL}.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await putObject(CMS_DOCUMENT_NAMESPACE, buffer, ext);

  return Response.json({
    ok: true,
    key,
    name: file.name,
    size: file.size,
    contentType: file.type,
    url: cmsDocumentUrl(key),
  });
}
