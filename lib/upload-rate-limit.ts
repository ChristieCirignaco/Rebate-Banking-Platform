// A tiny in-memory per-user upload throttle shared by the user upload routes (ticket attachments,
// deposit proofs, product images). Single-instance, like the register throttle — swap for a shared
// store when running multi-instance. Buckets are namespaced by `scope` so each route counts
// independently.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;

export function uploadLimited(scope: string, userId: string, max: number): boolean {
  const now = Date.now();
  for (const [k, hit] of hits) {
    if (hit.resetAt < now) hits.delete(k);
  }
  const key = `${scope}:${userId}`;
  const bucket = hits.get(key);
  if (!bucket || bucket.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}
