import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth-guards";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  // A signed-in user doesn't need to reset their password from the public flow.
  await redirectIfAuthenticated();

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

  return <ForgotPasswordForm logoUrl={branding.logoLight} recaptcha={recaptcha} />;
}
