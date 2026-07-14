import { getAdminSession } from "@/lib/auth-guards";
import { putObject } from "@/lib/storage";
import {
  extForContentType,
  kycDocumentUrl,
  MAX_KYC_FILE_BYTES,
} from "@/lib/kyc/files";

// POST /api/admin/kyc/upload — ingest one KYC document (multipart form field "file") into
// object storage and return its access-controlled URL + storage key. Admin-guarded; this
// is the API-ready ingestion point a user submission form (or admin tooling) posts to.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  // Reject oversized bodies before buffering them into memory. The authoritative check is
  // still file.size below; this bounds the obvious case (multipart overhead allowance).
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_KYC_FILE_BYTES + 16 * 1024) {
    return Response.json({ ok: false, error: "File must be 5 MB or smaller." }, { status: 413 });
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

  const ext = extForContentType(file.type);
  if (!ext) {
    return Response.json(
      { ok: false, error: "Only PNG, JPEG, WEBP, GIF or PDF files are allowed." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_KYC_FILE_BYTES) {
    return Response.json(
      { ok: false, error: "File must be between 1 byte and 5 MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await putObject("kyc", buffer, ext);

  return Response.json({
    ok: true,
    key,
    name: file.name,
    contentType: file.type,
    url: kycDocumentUrl(key),
  });
}
