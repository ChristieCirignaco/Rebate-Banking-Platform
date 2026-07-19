import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirectIfAuthenticated } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Create an account" };

// Shown in the T&C dialog when the admin hasn't set custom terms in Settings → Legal yet.
const FALLBACK_TERMS = `Welcome to Rebate Bank.

By creating an account you agree to use the service lawfully and to provide accurate
registration details. Your account is created in a pending state: you must verify your email
address, after which your registration is reviewed and manually approved before you can sign
in and access your dashboard.

You are responsible for keeping your login credentials secure and for all activity on your
account. We may suspend or close accounts that violate these terms or applicable law.

These are placeholder terms. The operator can replace them in the admin settings.`;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // Already signed in? Don't show the signup form (admins -> /admin, active users -> /dashboard).
  await redirectIfAuthenticated();

  const [{ ref }, registrationOpen, activationCodeRequired, branding, legal, plugins] =
    await Promise.all([
      searchParams,
      isFeatureEnabled("registration"),
      isFeatureEnabled("registration_activation_code"),
      getSettings("branding"),
      getSettings("legal"),
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

  if (!registrationOpen) {
    return (
      <AuthShell
        logoUrl={branding.logoLight}
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-white hover:underline">
              Login Here
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Registration is closed</h1>
          <p className="text-muted-foreground text-sm">
            New sign-ups are currently disabled. Please check back later.
          </p>
        </div>
      </AuthShell>
    );
  }

  const termsContent = legal.termsContent?.trim() ? legal.termsContent : FALLBACK_TERMS;

  return (
    <RegisterForm
      logoUrl={branding.logoLight}
      termsContent={termsContent}
      refCode={typeof ref === "string" ? ref.trim().slice(0, 32) : undefined}
      recaptcha={recaptcha}
      activationCodeRequired={activationCodeRequired}
    />
  );
}
