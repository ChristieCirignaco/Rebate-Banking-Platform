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

// Resolve the From identity: RESEND_FROM env override → the General-settings From
// name/email → a resend.dev default (works before a custom domain is verified). Read
// directly from the settings row to avoid pulling in the request-cached settings store.
async function resolveFrom(): Promise<string> {
  if (env.RESEND_FROM) return env.RESEND_FROM;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "general" } });
    const general = (row?.value ?? {}) as { fromEmail?: string; fromName?: string };
    if (general.fromEmail) {
      return general.fromName
        ? `${general.fromName} <${general.fromEmail}>`
        : general.fromEmail;
    }
  } catch {
    // Settings unavailable → fall through to the default sender.
  }
  return "Rebate Bank <onboarding@resend.dev>";
}

// The admin-configured Reply-To (General → Email Identity), if any. Replies to transactional
// mail go here instead of the (often no-reply) From address.
async function resolveReplyTo(): Promise<string | undefined> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "general" } });
    const general = (row?.value ?? {}) as { replyTo?: string };
    return general.replyTo?.trim() || undefined;
  } catch {
    return undefined;
  }
}

// Transactional mailer. Sends via Resend when RESEND_API_KEY is set; otherwise logs to the
// server console (dev — reset/verify/OTP tokens are readable there). Callers fire-and-
// forget (do not await), so failures are logged, never thrown.
export async function sendEmail({ to, subject, text, html }: SendEmailArgs): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.info(`[email] to=${to} | ${subject}\n${text}`);
    return;
  }
  try {
    const [from, replyTo] = await Promise.all([resolveFrom(), resolveReplyTo()]);
    // Send both parts when there's HTML: Resend builds the multipart/alternative, and the text
    // stays the fallback rather than being replaced by it. reply_to is included only when set.
    const payload: Record<string, unknown> = { from, to, subject, text };
    if (html) payload.html = html;
    if (replyTo) payload.reply_to = replyTo;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend failed (${res.status}) for ${to}: ${detail}`);
    }
  } catch (error) {
    console.error(`[email] Resend error for ${to}:`, error);
  }
}
