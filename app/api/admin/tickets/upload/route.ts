import { getAdminSession } from "@/lib/auth-guards";
import { putObject } from "@/lib/storage";
import {
  extForContentType,
  MAX_TICKET_FILE_BYTES,
  ticketAttachmentUrl,
} from "@/lib/tickets/files";

// POST /api/admin/tickets/upload — ingest one reply attachment into object storage and
// return its access-controlled URL + storage key. Admin-guarded; mirrors
// /api/admin/kyc/upload. The attach button on the reply form posts here per file.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_TICKET_FILE_BYTES + 16 * 1024) {
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
  if (file.size <= 0 || file.size > MAX_TICKET_FILE_BYTES) {
    return Response.json(
      { ok: false, error: "File must be between 1 byte and 5 MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await putObject("tickets", buffer, ext);

  return Response.json({
    ok: true,
    key,
    name: file.name,
    contentType: file.type,
    size: file.size,
    url: ticketAttachmentUrl(key),
  });
}
