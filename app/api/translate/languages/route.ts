import { getSession } from "@/lib/auth-guards";
import { FALLBACK_LANGUAGES, type TranslateLanguage } from "@/lib/translate/config";

// The languages the dropdown offers. Proxies TranslateX's /supported-languages (the key can't
// go to the browser), cached for the instance's lifetime since the list is effectively static.
// Falls back to a curated list when the API is unreachable or unconfigured, so the dropdown
// always renders.

const LANGUAGES_URL = "https://api.translatex.com/supported-languages";

let cached: TranslateLanguage[] | null = null;

async function fetchLanguages(key: string): Promise<TranslateLanguage[] | null> {
  try {
    const res = await fetch(LANGUAGES_URL, {
      headers: { "X-API-Key": key },
      // Static-ish data; let Next cache it for a day.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { languages?: unknown };
    if (!Array.isArray(data.languages)) return null;
    const list = data.languages.filter(
      (l): l is TranslateLanguage =>
        !!l &&
        typeof (l as TranslateLanguage).language === "string" &&
        typeof (l as TranslateLanguage).name === "string",
    );
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!(await getSession())) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  if (cached) return Response.json({ languages: cached });

  const key = process.env.TRANSLATEX_API_KEY?.trim();
  const live = key ? await fetchLanguages(key) : null;
  const languages = live ?? FALLBACK_LANGUAGES;
  if (live) cached = live; // only memoize the real list, so a fallback doesn't stick
  return Response.json({ languages });
}
