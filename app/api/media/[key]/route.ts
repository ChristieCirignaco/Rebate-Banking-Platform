import { getObject } from "@/lib/storage";
import { mediaContentTypeForKey } from "@/lib/media";

type Ctx = { params: Promise<{ key: string }> };

// GET /api/media/[key] — serve a PUBLIC brand image (logo / flag) from the "media"
// namespace. No auth (these are non-sensitive), but the namespace is hardcoded, so this
// route can NEVER reach the private "kyc" files. Long-cache (keys are immutable uuids);
// protective headers keep even an SVG safe when opened directly.
export async function GET(_request: Request, { params }: Ctx) {
  const { key } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = mediaContentTypeForKey(key);
  if (!contentType) return new Response("Not found", { status: 404 });

  const bytes = await getObject(`media/${key}`);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
