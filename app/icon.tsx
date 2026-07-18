import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getObject } from "@/lib/storage";
import { mediaContentTypeForKey } from "@/lib/media";
import { getSettings } from "@/lib/settings/store";

// Browser-tab favicon, driven by the admin Branding settings (`branding.favicon`). Replaces a
// static app/favicon.ico so a favicon set in Settings actually takes effect, app-wide (this file
// convention applies to every route — admin, user and marketing). Dynamic so it reflects the
// current setting; browsers cache the result.
//
// The stored value can take any shape an image field accepts (see isAcceptableImageValue): an
// uploaded media path (/api/media/<key>), an absolute URL, a legacy data: URI, or a bundled
// static path. The previous version only handled absolute URLs, so an UPLOADED favicon — which
// is a relative /api/media path — silently fell through to the bundled default. That's the bug
// this fixes.
export const dynamic = "force-dynamic";

async function fallback(): Promise<Response> {
  const buf = await readFile(join(process.cwd(), "public", "favicon.ico"));
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=300" },
  });
}

function extContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "ico") return "image/x-icon";
  return "image/x-icon";
}

export default async function Icon(): Promise<Response> {
  const branding = await getSettings("branding");
  const favicon = branding.favicon?.trim();
  if (!favicon) return fallback();

  try {
    // Legacy data: URI — decode and serve inline.
    const dataUri = /^data:([^;]+);base64,(.+)$/is.exec(favicon);
    if (dataUri) {
      return new Response(Buffer.from(dataUri[2], "base64"), {
        headers: { "Content-Type": dataUri[1] },
      });
    }

    // Absolute URL — proxy its bytes through so the browser tab uses it.
    if (/^https?:\/\//i.test(favicon)) {
      const res = await fetch(favicon, { next: { revalidate: 300 } });
      if (res.ok) {
        return new Response(await res.arrayBuffer(), {
          headers: { "Content-Type": res.headers.get("content-type") ?? "image/x-icon" },
        });
      }
      return fallback();
    }

    // Uploaded via the media system: /api/media/<key>. Read the object directly rather than
    // HTTP-fetching our own route (no host to resolve, works the same on Blob or the filesystem).
    const media = /^\/api\/media\/([A-Za-z0-9._-]+)$/.exec(favicon);
    if (media) {
      const key = media[1];
      const bytes = await getObject(`media/${key}`);
      const contentType = mediaContentTypeForKey(key);
      if (bytes && contentType) {
        return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType } });
      }
      return fallback();
    }

    // Any other bundled/static path under public (e.g. /favicon.ico, /gateways/x.svg).
    if (favicon.startsWith("/") && !favicon.includes("..")) {
      const rel = favicon.replace(/^\/+/, "");
      const buf = await readFile(join(process.cwd(), "public", rel));
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": extContentType(rel) } });
    }
  } catch {
    // Any read/fetch failure degrades to the bundled default rather than a broken tab icon.
  }

  return fallback();
}
