"use server";

import { getSession } from "@/lib/auth-guards";
import { resendLoginOtpCode, verifyLoginOtp } from "@/lib/login-otp";
import { verifyRecaptcha } from "@/lib/recaptcha";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Verify the 6-digit login OTP for the current signed-in (but not-yet-verified) session.
// These two are server actions, not Better Auth endpoints, so the before-hook in lib/auth.ts
// can't see them — the captcha check has to live here. Same verifier and the same fail-open
// rules, so an operator who hasn't configured reCAPTCHA is unaffected.
export async function verifyLoginOtpAction(
  code: string,
  recaptchaToken?: string,
): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Session expired. Please sign in again." };

  // Before the code comparison: a six-digit code is the most brute-forceable secret in the
  // app, and the caller already holds a valid password to be standing here at all.
  const captcha = await verifyRecaptcha(recaptchaToken, "verify-otp");
  if (!captcha.ok) return { ok: false, error: captcha.error };

  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code." };
  return verifyLoginOtp(s.session.id, code.trim());
}

// Issue a fresh code to the current user's email (subject to the cooldown + per-session cap).
export async function resendLoginOtpAction(
  recaptchaToken?: string,
): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Session expired." };

  // Guarded too: each resend sends a real email, so an unguarded loop is an email bomb.
  const captcha = await verifyRecaptcha(recaptchaToken, "verify-otp");
  if (!captcha.ok) return { ok: false, error: captcha.error };

  return resendLoginOtpCode(s.session.id, s.user.id, s.user.email);
}
