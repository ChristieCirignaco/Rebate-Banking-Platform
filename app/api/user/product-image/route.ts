import { getSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { putObject } from "@/lib/storage";

// Product photos can be larger than brand images, but still bounded.
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
// User-uploaded raster images only — no SVG (script/XSS surface) for untrusted uploads.
const PRODUCT_IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Per-user upload cap so one session can't fill the disk with orphan files. In-memory
// (single-instance) like the register throttle — swap for a shared store when multi-instance.
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOADS_PER_USER = 30;
const uploadHits = new Map<string, { count: number; resetAt: number }>();

function uploadLimited(userId: string): boolean {
  const now = Date.now();
  for (const [key, hit] of uploadHits) {
    if (hit.resetAt < now) uploadHits.delete(key);
  }
  const bucket = uploadHits.get(userId);
  if (!bucket || bucket.resetAt < now) {
    uploadHits.set(userId, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_UPLOADS_PER_USER;
}

// POST /api/user/product-image — accept ONE product photo from a signed-in, active regular
// user and return its served URL. Stored in the public "media" namespace.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
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

  if (uploadLimited(session.user.id)) {
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
  if (declared > MAX_PRODUCT_IMAGE_BYTES + 16 * 1024) {
    return Response.json({ ok: false, error: "Image must be 5 MB or smaller." }, { status: 413 });
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

  const ext = PRODUCT_IMAGE_EXT[file.type];
  if (!ext) {
    return Response.json(
      { ok: false, error: "Only PNG, JPEG or WEBP images are allowed." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return Response.json(
      { ok: false, error: "Image must be between 1 byte and 5 MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await putObject("media", buffer, ext);
  return Response.json({ ok: true, url: mediaUrl(key) });
}
