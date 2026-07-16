import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { del, get, list, put } from "@vercel/blob";

// Object storage behind a tiny interface. The returned opaque key (`<namespace>/<uuid>.<ext>`)
// is the ONLY contract — callers store it and hand it back; nothing else may leak.
//
// Two backends, chosen by whether a Blob token is present:
//
//   Vercel Blob  — production. Serverless filesystems are ephemeral and read-only outside
//                  /tmp, so writing uploads to disk there fails or silently evaporates
//                  between invocations. Blobs are stored `access: "private"`, i.e. NOT
//                  reachable by URL: they're read back through get() with the store's token,
//                  which keeps the existing rule that a KYC document is only ever served via
//                  our own access-controlled route.
//   Filesystem   — local dev, unchanged. Files live outside `public/` for the same reason.
//
// The key is used verbatim as the Blob pathname, so keys are portable between the two.
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

// Is a Blob store reachable? This mirrors @vercel/blob's OWN credential resolution, in its
// order, because a mismatch is silent in the worst way: we'd fall back to the filesystem on a
// serverless host and every upload would fail or vanish, with no error pointing here.
//
//   1. OIDC — VERCEL_OIDC_TOKEN + BLOB_STORE_ID. What a store connected to the project
//      actually injects today; there is NO BLOB_READ_WRITE_TOKEN in that setup.
//   2. BLOB_READ_WRITE_TOKEN — the older/manual token, still supported by the SDK.
//
// Read lazily (not at module load) so credentials added later don't need a rebuild, and so
// local dev never depends on them. NB: not named use* — that reads as a React hook to eslint.
function blobEnabled(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID);
}

// Resolve a key to an absolute path, refusing anything that escapes the storage root
// (absolute keys, "..", etc). The serving route passes a user-influenced key, so this
// traversal guard is load-bearing.
function resolveKey(key: string): string {
  const full = path.resolve(STORAGE_ROOT, key);
  if (full !== STORAGE_ROOT && !full.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

// The Blob backend has no filesystem root to escape, but a key still reaches it from a
// user-influenced route, so apply the same shape rule: a plain relative `ns/name.ext`.
function assertSafeKey(key: string): string {
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(key) || key.includes("..")) {
    throw new Error("Invalid storage key");
  }
  return key;
}

// Store bytes under `<namespace>/<uuid>.<ext>` and return the opaque key.
export async function putObject(
  namespace: string,
  data: Buffer,
  ext: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const key = `${namespace}/${randomUUID()}.${safeExt}`;

  if (blobEnabled()) {
    // addRandomSuffix: false keeps the returned pathname EXACTLY equal to our key — the uuid
    // already makes it unguessable, and a suffix would break get()/del() by pathname.
    await put(key, data, { access: "private", addRandomSuffix: false });
    return key;
  }

  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

// Read an object's bytes, or null if it doesn't exist.
export async function getObject(key: string): Promise<Buffer | null> {
  if (blobEnabled()) {
    try {
      const result = await get(assertSafeKey(key), { access: "private" });
      if (!result?.stream) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch {
      // A missing blob throws rather than returning null — same contract as ENOENT below.
      return null;
    }
  }

  try {
    return await readFile(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// Remove an object; a missing object is not an error (idempotent).
export async function deleteObject(key: string): Promise<void> {
  if (blobEnabled()) {
    try {
      await del(assertSafeKey(key));
    } catch {
      // Idempotent: deleting what isn't there is a no-op, matching the fs branch.
    }
    return;
  }

  try {
    await unlink(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// Wipe an entire namespace — used by the seed to stay idempotent across runs.
export async function clearNamespace(namespace: string): Promise<void> {
  if (blobEnabled()) {
    // list() pages; keep going until the cursor runs out or a namespace with many objects
    // would only be half-cleared.
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `${namespace}/`, cursor, limit: 1000 });
      if (page.blobs.length > 0) await del(page.blobs.map((blob) => blob.url));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return;
  }

  await rm(resolveKey(namespace), { recursive: true, force: true });
}
