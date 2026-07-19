import type { Metadata } from "next";

import { TwoFactorChallengeForm } from "@/components/auth/two-factor-challenge-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Two-factor authentication" };

// The 2FA sign-in challenge. There is NO session yet at this point — the challenge is
// carried by a signed "two_factor" cookie the browser sends automatically — so this page
// intentionally does not gate on a session.
export default async function TwoFactorPage() {
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

  return <TwoFactorChallengeForm logoUrl={branding.logoLight} recaptcha={recaptcha} />;
}
