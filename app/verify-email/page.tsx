import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage() {
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

  // VerifyEmailForm reads ?error=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <VerifyEmailForm logoUrl={branding.logoLight} recaptcha={recaptcha} />
    </Suspense>
  );
}
