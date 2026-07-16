import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getSettings } from "@/lib/settings/store";

// Browser-tab favicon, driven by the admin Branding settings (`branding.favicon`). Replaces a
// static app/favicon.ico so a favicon set in Settings actually takes effect. Falls back to the
// bundled default (public/favicon.ico) when none is configured. Dynamic so it reflects the
// current setting; browsers cache the result.
export const dynamic = "force-dynamic";

export default async function Icon() {
  const branding = await getSettings("branding");
  const favicon = branding.favicon?.trim();

  // A configured absolute URL wins — proxy its bytes through so the browser tab uses it.
  if (favicon && /^https?:\/\//i.test(favicon)) {
    try {
      const res = await fetch(favicon, { next: { revalidate: 300 } });
      if (res.ok) {
        return new Response(await res.arrayBuffer(), {
          headers: { "Content-Type": res.headers.get("content-type") ?? "image/x-icon" },
        });
      }
    } catch {
      // fall through to the bundled default
    }
  }

  const buf = await readFile(join(process.cwd(), "public", "favicon.ico"));
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/x-icon" } });
}
