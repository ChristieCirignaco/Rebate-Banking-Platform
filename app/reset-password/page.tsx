import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage() {
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

  // ResetPasswordForm reads ?token= / ?error=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <ResetPasswordForm logoUrl={branding.logoLight} recaptcha={recaptcha} />
    </Suspense>
  );
}
