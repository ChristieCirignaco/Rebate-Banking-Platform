import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { afterResponse } from "@/lib/after-response";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email/template";

// Mirrors lib/auth-guards ADMIN_ROLES; kept local to avoid a circular import (auth-guards
// imports this module). Any non-admin role — including a null/legacy role — is a regular user.
const ADMIN_ROLE_SET = new Set(["admin", "super_admin"]);

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // wrong guesses allowed against a single code
const MAX_SENDS = 5; // codes a session may ever be issued (durable brute-force cap)
const RESEND_COOLDOWN_MS = 20 * 1000; // server-enforced minimum gap between codes

function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// HMAC-SHA256 keyed on the auth secret — the code is never stored in the clear.
function hashOtp(code: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(code).digest("hex");
}

// Whether the admin has turned on the "email OTP on login" gate. Read straight from the
// settings row so it works from any context (guards, pages, actions).
export async function isEmailOtpOnLoginEnabled(): Promise<boolean> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "security" } });
  const security = (row?.value ?? {}) as { emailOtpOnLogin?: boolean };
  return security.emailOtpOnLogin === true;
}

export type IssueOtpResult = { ok: true } | { ok: false; error: string };

// Mint a fresh code for a session and email it, subject to durable limits. Returns an error
// (rather than throwing) when a limit is hit so callers can surface it. The per-session
// `sends` cap is the brute-force backstop: with at most MAX_SENDS codes × MAX_ATTEMPTS guesses
// each, a session can never make more than MAX_SENDS*MAX_ATTEMPTS guesses at the 6-digit space,
// and a resend can no longer reset that budget. Never touches an already-verified row.
async function issueCode(
  sessionId: string,
  userId: string,
  email: string,
): Promise<IssueOtpResult> {
  const row = await prisma.loginOtp.findUnique({ where: { sessionId } });
  if (row?.verifiedAt) return { ok: true }; // already verified — nothing to send, never re-lock

  if (row?.lastSentAt && Date.now() - row.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "Please wait a moment before requesting another code." };
  }
  if ((row?.sends ?? 0) >= MAX_SENDS) {
    return { ok: false, error: "Too many codes requested. Please sign in again." };
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await prisma.loginOtp.upsert({
    where: { sessionId },
    update: {
      codeHash,
      attempts: 0,
      expiresAt,
      userId,
      lastSentAt: now,
      sends: { increment: 1 },
    },
    create: { sessionId, userId, codeHash, expiresAt, lastSentAt: now, sends: 1 },
  });

  // No CTA: the code is entered on the tab the user already has open, and a "sign in" button
  // here would just invite them to start a second, competing session.
  afterResponse(async () => {
    const mail = await renderEmail({
      audience: "user",
      heading: "Your sign-in code",
      paragraphs: ["Enter this code to finish signing in. It expires in 10 minutes."],
      code,
      note: "If you didn't try to sign in, someone may have your password — change it and contact support.",
    });
    await sendEmail({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  });
  return { ok: true };
}

// Whether the given session still has to clear the email-OTP gate before reaching the app.
// Fail-closed: with the gate on, a regular user's session is blocked until it carries a
// `verifiedAt` marker, so a missing/failed challenge never silently opens the gate.
export async function needsLoginOtpVerification(
  sessionId: string,
  role: string | null | undefined,
): Promise<boolean> {
  // Gate every non-admin (regular) user, including a null/legacy role — never fail open.
  if (role && ADMIN_ROLE_SET.has(role)) return false;
  if (!(await isEmailOtpOnLoginEnabled())) return false;
  const row = await prisma.loginOtp.findUnique({
    where: { sessionId },
    select: { verifiedAt: true },
  });
  return !row?.verifiedAt;
}

// Idempotently make sure a live code exists for a session that needs verification, emailing
// one only when there isn't already a usable (unexpired, not-locked, unverified) code and the
// limits allow it. Called from the /verify-otp page, where the session is guaranteed to exist.
export async function ensureLoginOtpCode(
  sessionId: string,
  userId: string,
  email: string,
): Promise<void> {
  const row = await prisma.loginOtp.findUnique({ where: { sessionId } });
  if (row?.verifiedAt) return; // already verified — nothing to send
  const usable =
    row && row.expiresAt.getTime() > Date.now() && row.attempts < MAX_ATTEMPTS;
  if (usable) return; // a live code is already outstanding
  await issueCode(sessionId, userId, email); // limit failures are surfaced via the resend action
}

// Explicit resend from the "Resend" button — mints a new code, honoring the same cooldown and
// per-session send cap. Returns an error when a limit is hit so the UI can tell the user.
export async function resendLoginOtpCode(
  sessionId: string,
  userId: string,
  email: string,
): Promise<IssueOtpResult> {
  return issueCode(sessionId, userId, email);
}

export type VerifyLoginOtpResult = { ok: true } | { ok: false; error: string };

// Verify a submitted code for a session. On success the row is marked verified (kept as the
// per-session gate marker); it is never deleted here, so the gate stays open for the rest of
// the session. Wrong codes increment attempts; an expired or over-budget code asks for a
// resend (which mints a fresh one, up to the per-session send cap).
export async function verifyLoginOtp(
  sessionId: string,
  code: string,
): Promise<VerifyLoginOtpResult> {
  const row = await prisma.loginOtp.findUnique({ where: { sessionId } });
  if (!row) return { ok: false, error: "No pending code. Please resend." };
  if (row.verifiedAt) return { ok: true }; // already verified — idempotent

  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Code expired. Please resend." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Please resend a new code." };
  }

  const submitted = Buffer.from(hashOtp(code.trim()), "hex");
  const expected = Buffer.from(row.codeHash, "hex");
  const match = submitted.length === expected.length && timingSafeEqual(submitted, expected);
  if (!match) {
    await prisma.loginOtp.update({
      where: { sessionId },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.loginOtp.update({
    where: { sessionId },
    data: { verifiedAt: new Date() },
  });
  return { ok: true };
}
