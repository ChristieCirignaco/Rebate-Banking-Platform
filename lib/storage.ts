import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Filesystem-backed object storage behind a tiny interface. Files live OUTSIDE the public
// directory and are reachable only through an access-controlled route (never a public URL),
// which matters for sensitive KYC documents. Swap this module's body for S3/GCS/R2 later
// without touching callers — the returned opaque key is the only contract.
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

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

// Store bytes under `<namespace>/<uuid>.<ext>` and return the opaque key.
export async function putObject(
  namespace: string,
  data: Buffer,
  ext: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const key = `${namespace}/${randomUUID()}.${safeExt}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

// Read an object's bytes, or null if it doesn't exist.
export async function getObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// Remove an object; a missing object is not an error (idempotent).
export async function deleteObject(key: string): Promise<void> {
  try {
    await unlink(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// Wipe an entire namespace — used by the seed to stay idempotent across runs.
export async function clearNamespace(namespace: string): Promise<void> {
  await rm(resolveKey(namespace), { recursive: true, force: true });
}
