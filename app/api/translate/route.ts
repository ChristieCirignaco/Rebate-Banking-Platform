import { getSession } from "@/lib/auth-guards";
import {
  MAX_TEXT_LENGTH,
  MAX_TEXTS_PER_REQUEST,
  SOURCE_LANG,
} from "@/lib/translate/config";

// Backend proxy for TranslateX. The API forbids cross-domain (browser) calls and the key must
// never reach the client, so all translation goes through here. Also gated on a signed-in user
// so an anonymous caller can't burn the translation quota.
//
// POST body: { texts: string[], target: string } → { translations: string[] } in the same order.

const TRANSLATE_URL = "https://api.translatex.com/translate";

// Per-instance cache of (target,text) → translation. UI labels repeat heavily across pages and
// users, so this turns most page loads into few or zero upstream calls. Bounded, oldest-out.
const CACHE_LIMIT = 50_000;
const cache = new Map<string, string>();

function cacheKey(target: string, text: string): string {
  return `${target}\t${text}`;
}

function cacheGet(target: string, text: string): string | undefined {
  return cache.get(cacheKey(target, text));
}

function cacheSet(target: string, text: string, value: string): void {
  const key = cacheKey(target, text);
  if (cache.has(key)) return;
  if (cache.size >= CACHE_LIMIT) {
    // Map keeps insertion order; drop the oldest entry.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

// Translate one batch (already ≤ MAX_TEXTS_PER_REQUEST) via TranslateX. Returns translations
// aligned to `batch`, or null on any failure so the caller can fall back to the originals.
async function translateBatch(
  batch: string[],
  target: string,
  key: string,
): Promise<string[] | null> {
  const body = new URLSearchParams();
  for (const text of batch) body.append("text", text);

  try {
    const res = await fetch(`${TRANSLATE_URL}?sl=${SOURCE_LANG}&tl=${encodeURIComponent(target)}`, {
      method: "POST",
      // Key in a header, never the URL, so it doesn't leak into logs.
      headers: { "content-type": "application/x-www-form-urlencoded", "X-API-Key": key },
      body: body.toString(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { translation?: unknown };
    if (!Array.isArray(data.translation) || data.translation.length !== batch.length) return null;
    return data.translation.map((t) => (typeof t === "string" ? t : ""));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const key = process.env.TRANSLATEX_API_KEY?.trim();
  if (!key) {
    // Not configured — tell the client so it can quietly stay in the source language.
    return Response.json({ error: "Translation is not configured." }, { status: 503 });
  }

  let payload: { texts?: unknown; target?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const target = typeof payload.target === "string" ? payload.target.trim().toLowerCase() : "";
  const texts = Array.isArray(payload.texts) ? payload.texts : null;
  if (!target || !texts) {
    return Response.json({ error: "texts[] and target are required." }, { status: 400 });
  }

  // Normalize input to strings and hard-cap the count so one request can't fan out unbounded.
  const input = texts
    .slice(0, 2000)
    .map((t) => (typeof t === "string" ? t : ""))
    .map((t) => (t.length > MAX_TEXT_LENGTH ? t.slice(0, MAX_TEXT_LENGTH) : t));

  // Selecting the source language is a no-op; hand the originals straight back.
  if (target === SOURCE_LANG) {
    return Response.json({ translations: input });
  }

  // Serve what's cached; collect the rest (deduped) for the upstream call.
  const result = new Array<string | null>(input.length).fill(null);
  const missingByText = new Map<string, number[]>(); // text → positions needing it
  input.forEach((text, i) => {
    if (!text.trim()) {
      result[i] = text; // whitespace/empty: nothing to translate
      return;
    }
    const hit = cacheGet(target, text);
    if (hit !== undefined) {
      result[i] = hit;
      return;
    }
    const positions = missingByText.get(text);
    if (positions) positions.push(i);
    else missingByText.set(text, [i]);
  });

  const uniqueMissing = [...missingByText.keys()];
  for (let start = 0; start < uniqueMissing.length; start += MAX_TEXTS_PER_REQUEST) {
    const batch = uniqueMissing.slice(start, start + MAX_TEXTS_PER_REQUEST);
    const translated = await translateBatch(batch, target, key);
    batch.forEach((text, j) => {
      // On failure, fall back to the original so the page isn't left blank.
      const value = translated ? translated[j] : text;
      if (translated) cacheSet(target, text, value);
      for (const pos of missingByText.get(text) ?? []) result[pos] = value;
    });
  }

  return Response.json({ translations: result.map((r, i) => r ?? input[i]) });
}
