import { getSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { signKycDocument } from "@/lib/kyc/attachment-token";
import { extForContentType, MAX_KYC_FILE_BYTES } from "@/lib/kyc/files";
import { putObject } from "@/lib/storage";
import { uploadLimited } from "@/lib/upload-rate-limit";

const MAX_UPLOADS_PER_USER = 20;

// POST /api/user/kyc-document — a signed-in active user uploads ONE identity document (image/PDF)
// for a KYC submission into the private "kyc" namespace. Returns the opaque storage key plus a
// per-user token proving this user uploaded it; submitKyc rejects any file value without a valid
// token. Served back only through the access-controlled /api/kyc-documents/[key] route.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: "Not authorized." }, { status: 401 });
  if (isAdminTierRole(session.user.role)) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 403 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });
  if (!user || user.status !== "active") {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 403 });
  }

  if (uploadLimited("kyc", session.user.id, MAX_UPLOADS_PER_USER)) {
    return Response.json(
      { ok: false, error: "Too many uploads. Please try again later." },
      { status: 429 },
    );
  }

  // Require a declared body size and bound it BEFORE buffering. A chunked request carries no
  // content-length, so this also blocks the "stream a huge body past the size check" vector.
  const contentLength = request.headers.get("content-length");
  const declared = Number(contentLength ?? "");
  if (!contentLength || !Number.isFinite(declared)) {
    return Response.json({ ok: false, error: "Length required." }, { status: 411 });
  }
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
    token: signKycDocument(key, session.user.id), // proves this user uploaded this key
  });
}
