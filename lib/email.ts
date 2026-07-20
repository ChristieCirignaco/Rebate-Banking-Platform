import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

type SendEmailArgs = {
  to: string;
  subject: string;
  // Always required: it is the plain-text alternative every HTML mail should carry (clients
  // that refuse HTML, screen readers, and spam scoring all want it), and it is what the
  // no-API-key dev path logs.
  text: string;
  html?: string;
};

// Resend's default account limit is 2 requests/second. Requests are paced to just under that;
// a burst that ignores it earns 429s, and a 429 with no retry is a SILENTLY DROPPED email.
const MIN_SEND_INTERVAL_MS = 550;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

// Serialize send *starts* through one chain so concurrent callers queue instead of bursting.
// Per-instance, not global — separate serverless instances each keep their own pace — but it is
// what stops the case that actually bit us: a broadcast firing 20 requests at once.
let sendChain: Promise<void> = Promise.resolve();
let lastSendAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function paced<T>(task: () => Promise<T>): Promise<T> {
  const slot = sendChain.then(async () => {
    const wait = lastSendAt + MIN_SEND_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastSendAt = Date.now();
  });
  // Chain on the delay only, not the request: we are pacing when sends START, and a slow or
  // failed send must not stall everything queued behind it.
  sendChain = slot.catch(() => {});
  return slot.then(task);
}

type EmailIdentity = { from: string; replyTo?: string };

// Resolve the From identity and Reply-To in ONE query. These used to be two functions that each
// read the same `general` settings row, so every email cost two identical round trips — pure
// latency on a path whose whole point is to be fast.
//
// From: RESEND_FROM env override → General-settings From name/email → a resend.dev default
// (works before a custom domain is verified). Reply-To: General → Email Identity, if set.
async function resolveIdentity(): Promise<EmailIdentity> {
  let general: { fromEmail?: string; fromName?: string; replyTo?: string } = {};
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "general" } });
    general = (row?.value ?? {}) as typeof general;
  } catch {
    // Settings unavailable → fall through to the env override / default sender.
  }

  const replyTo = general.replyTo?.trim() || undefined;
  if (env.RESEND_FROM) return { from: env.RESEND_FROM, replyTo };
  if (general.fromEmail) {
    return {
      from: general.fromName ? `${general.fromName} <${general.fromEmail}>` : general.fromEmail,
      replyTo,
    };
  }
  return { from: "Rebate Bank <onboarding@resend.dev>", replyTo };
}

/**
 * Transactional mailer. Sends via Resend when RESEND_API_KEY is set; otherwise logs to the
 * server console (dev — reset/verify/OTP tokens are readable there).
 *
 * Never throws: returns false on failure so a caller can react, while a caller that ignores the
 * result still cannot fail a committed transaction over a mail problem.
 *
 * IMPORTANT: do not call this from a detached promise. On serverless the instance can be frozen
 * the moment the response finishes, suspending the request mid-flight. Defer it with
 * `afterResponse()` (lib/after-response.ts) instead.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailArgs): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.info(`[email] to=${to} | ${subject}\n${text}`);
    return true;
  }

  const { from, replyTo } = await resolveIdentity();
  // Send both parts when there's HTML: Resend builds the multipart/alternative, and the text
  // stays the fallback rather than being replaced by it. reply_to is included only when set.
  const payload: Record<string, unknown> = { from, to, subject, text };
  if (html) payload.html = html;
  if (replyTo) payload.reply_to = replyTo;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let res: Response;
    try {
      res = await paced(() =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          // Without this a stalled connection hangs the send indefinitely, holding the
          // invocation open until the platform kills it.
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
      );
    } catch (error) {
      // Network error or timeout — worth another attempt.
      if (attempt === MAX_ATTEMPTS) {
        console.error(`[email] Resend error for ${to} after ${attempt} attempts:`, error);
        return false;
      }
      await sleep(500 * 2 ** (attempt - 1));
      continue;
    }

    if (res.ok) return true;

    // 429 = rate limited, 5xx = Resend-side. Both are worth another go; a 4xx (bad address,
    // unverified domain) is our fault and would fail identically forever, so stop.
    const retryable = res.status === 429 || res.status >= 500;
    const detail = await res.text().catch(() => "");
    if (!retryable || attempt === MAX_ATTEMPTS) {
      console.error(`[email] Resend failed (${res.status}) for ${to}: ${detail}`);
      return false;
    }

    // Honour Retry-After when Resend sends one, else exponential backoff.
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10_000)
        : 500 * 2 ** (attempt - 1);
    console.warn(`[email] Resend ${res.status} for ${to}; retrying in ${backoff}ms`);
    await sleep(backoff);
  }

  return false;
}
