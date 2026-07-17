import { getAdminSession } from "@/lib/auth-guards";
import { putObject } from "@/lib/storage";
import { MAX_MEDIA_BYTES, MAX_MEDIA_LABEL, mediaExtForContentType, mediaUrl } from "@/lib/media";

// POST /api/admin/media — ingest one public brand image (logo / flag) into object storage
// and return its served URL. Admin-guarded; replaces the old base64 data-URI path.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  // Reject oversized bodies before buffering them into memory. The authoritative check is
  // still file.size below; this just bounds the obvious case.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_MEDIA_BYTES + 16 * 1024) {
    return Response.json(
      { ok: false, error: `Image must be ${MAX_MEDIA_LABEL} or smaller.` },
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

  const ext = mediaExtForContentType(file.type);
  if (!ext) {
    return Response.json(
      { ok: false, error: "Only PNG, JPEG, WEBP, GIF or SVG images are allowed." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_MEDIA_BYTES) {
    return Response.json(
      { ok: false, error: `Image must be between 1 byte and ${MAX_MEDIA_LABEL}.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await putObject("media", buffer, ext);

  return Response.json({
    ok: true,
    key,
    name: file.name,
    contentType: file.type,
    url: mediaUrl(key),
  });
}
