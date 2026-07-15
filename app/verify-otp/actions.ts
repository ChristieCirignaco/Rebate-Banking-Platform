"use server";

import { getSession } from "@/lib/auth-guards";
import { resendLoginOtpCode, verifyLoginOtp } from "@/lib/login-otp";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Verify the 6-digit login OTP for the current signed-in (but not-yet-verified) session.
export async function verifyLoginOtpAction(code: string): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Session expired. Please sign in again." };
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code." };
  return verifyLoginOtp(s.session.id, code.trim());
}

// Issue a fresh code to the current user's email (subject to the cooldown + per-session cap).
export async function resendLoginOtpAction(): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Session expired." };
  return resendLoginOtpCode(s.session.id, s.user.id, s.user.email);
}
