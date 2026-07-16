import { getSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { putObject } from "@/lib/storage";
import { uploadLimited } from "@/lib/upload-rate-limit";

// Avatars are small — a profile photo never needs more than this.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
// User-uploaded raster images only — no SVG (script/XSS surface) for untrusted uploads.
const AVATAR_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_UPLOADS_PER_USER = 10;

// POST /api/user/avatar — accept ONE profile photo from a signed-in, active regular user and
// return its served URL. Stored in the public "media" namespace and served by /api/media/[key]:
// an avatar is non-sensitive (it is already shown in every header), so it follows the
// product-image pattern rather than the admin-only kyc-document one.
//
// Writing User.image is NOT done here — this route only stores bytes and hands back a URL. The
// profile action (app/account/profile/actions.ts) persists it, so the column is written in one
// place, behind the full page gate.
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

  if (uploadLimited("avatar", session.user.id, MAX_UPLOADS_PER_USER)) {
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
  if (declared > MAX_AVATAR_BYTES + 16 * 1024) {
    return Response.json({ ok: false, error: "Image must be 2 MB or smaller." }, { status: 413 });
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

  const ext = AVATAR_EXT[file.type];
  if (!ext) {
    return Response.json(
      { ok: false, error: "Only PNG, JPEG or WEBP images are allowed." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return Response.json(
      { ok: false, error: "Image must be between 1 byte and 2 MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await putObject("media", buffer, ext);
  return Response.json({ ok: true, url: mediaUrl(key) });
}
