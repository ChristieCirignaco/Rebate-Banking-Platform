import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSession, getSession } from "@/lib/auth-guards";
import { ADMIN_AUTH_ARTWORK } from "@/lib/admin/auth-artwork";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function AdminLoginPage() {
  // Already signed in? Send admins to the panel; a signed-in regular user to their area.
  if (await getAdminSession()) redirect("/admin");
  if (await getSession()) redirect("/dashboard");

  // Logo and brand name are admin-configurable, so both are read here rather than hardcoded —
  // same fallback chain the root layout and admin layout use.
  const [branding, general, plugins] = await Promise.all([
    getSettings("branding"),
    getSettings("general"),
    getSettings("plugins"),
  ]);
  const brandName = general.brandName || general.siteTitle || "Rebate Bank";

  // Only the three PUBLIC reCAPTCHA fields cross to the client — never recaptchaSecretKey. The
  // site key is public by design (it's what mints tokens in the browser); the secret verifies
  // them server-side and stays in lib/recaptcha.
  const recaptcha = {
    enabled: plugins.recaptchaEnabled,
    siteKey: plugins.recaptchaSiteKey,
    version: plugins.recaptchaVersion,
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        {/* AdminLoginForm reads ?redirect=, so it needs a Suspense boundary. */}
        <Suspense>
          <AdminLoginForm
            brandName={brandName}
            logoUrl={branding.logoLight}
            imageUrl={ADMIN_AUTH_ARTWORK}
            recaptcha={recaptcha}
          />
        </Suspense>
      </div>
    </div>
  );
}
