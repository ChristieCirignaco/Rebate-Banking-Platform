import { getSettings } from "@/lib/settings/store";

// Server-only by construction: getSettings pulls in the Prisma client and the decrypted secret
// key, neither of which can cross to the browser — the same guarantee ipinfo.ts relies on. (The
// repo doesn't use the `server-only` package; it isn't a dependency here.)

// Google reCAPTCHA token verification. The admin Plugins tab already stored a site key, a secret
// key and a version — this is the half that was missing: nothing ever checked a token, so
// enabling reCAPTCHA protected nothing and only manufactured false confidence.
//
// The site key is public (it's in SETTINGS defaults, not SECRET_FIELDS) and ships to the browser
// to mint tokens; the secret key is encrypted at rest and only ever used here, server-side.

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// v3 hands back a 0..1 score; 0.5 is Google's documented default cut for "probably human". v2
// (the checkbox) returns no score, so this only applies to v3 responses.
const V3_MIN_SCORE = 0.5;

const FAIL = { ok: false as const, error: "Captcha verification failed. Please try again." };

export type RecaptchaResult = { ok: true } | { ok: false; error: string };

type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

// Verify a client token. `expectedAction` is the v3 action name the token should have been
// minted with (e.g. "register"); ignored for v2.
//
// Two fail-OPEN cases, both deliberate and both narrow:
//   1. reCAPTCHA disabled, or enabled but not yet configured (no secret) — the admin hasn't
//      turned this protection on, so it isn't this function's place to block anyone.
//   2. Google itself is unreachable — a transient outage at Google must not take our own
//      registration down with it. The register action's IP/email rate limiter still applies
//      underneath, so this isn't an open door.
//
// Everything else fails CLOSED: once enabled and configured, a missing token, a rejected token,
// a low v3 score, or an action mismatch all block. A missing token failing open would let any
// bot pass by simply omitting the field, which is the exact hole this closes.
export async function verifyRecaptcha(
  token: string | undefined | null,
  expectedAction?: string,
): Promise<RecaptchaResult> {
  const plugins = await getSettings("plugins");
  if (!plugins.recaptchaEnabled || !plugins.recaptchaSecretKey) return { ok: true };

  if (!token) return FAIL;

  let data: SiteVerifyResponse;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: plugins.recaptchaSecretKey, response: token }),
      cache: "no-store", // each token is single-use; a cached verdict would be wrong and unsafe
    });
    if (!res.ok) return { ok: true }; // 5xx from Google → treat as the outage case, fail open
    data = (await res.json()) as SiteVerifyResponse;
  } catch {
    return { ok: true }; // network error reaching Google → outage case, fail open
  }

  if (!data.success) return FAIL;

  if (plugins.recaptchaVersion === "v3" && typeof data.score === "number") {
    if (data.score < V3_MIN_SCORE) return FAIL;
    // Only enforce the action when Google echoed one back — a mismatch means the token was
    // minted for a different form (or replayed), which is exactly what the action binding guards.
    if (expectedAction && data.action && data.action !== expectedAction) return FAIL;
  }

  return { ok: true };
}
