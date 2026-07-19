import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { getSession, isAdminTierRole } from "@/lib/auth-guards";
import { ensureLoginOtpCode, needsLoginOtpVerification } from "@/lib/login-otp";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Verify it's you" };

export default async function VerifyOtpPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Admins never go through the user login-OTP gate.
  if (isAdminTierRole(session.user.role)) redirect("/admin");
  // Already verified (or the gate is off) — this step is done.
  if (!(await needsLoginOtpVerification(session.session.id, session.user.role))) {
    redirect("/dashboard");
  }

  // Mint + email the code here, where the session is guaranteed to exist. Idempotent, so a
  // refresh or double render won't spam a second email while a live code is outstanding.
  await ensureLoginOtpCode(session.session.id, session.user.id, session.user.email);

  const [branding, plugins] = await Promise.all([
    getSettings("branding"),
    getSettings("plugins"),
  ]);

  // Only the three PUBLIC reCAPTCHA fields cross to the client — never recaptchaSecretKey. The
  // site key is public by design (it's what mints tokens in the browser); the secret verifies
  // them server-side and stays in lib/recaptcha.
  const recaptcha = {
    enabled: plugins.recaptchaEnabled,
    siteKey: plugins.recaptchaSiteKey,
    version: plugins.recaptchaVersion,
  };

  return (
    <VerifyOtpForm
      logoUrl={branding.logoLight}
      email={session.user.email}
      recaptcha={recaptcha}
    />
  );
}
