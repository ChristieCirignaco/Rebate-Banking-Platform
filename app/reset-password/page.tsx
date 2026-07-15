import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage() {
  const branding = await getSettings("branding");

  // ResetPasswordForm reads ?token= / ?error=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <ResetPasswordForm logoUrl={branding.logoLight} />
    </Suspense>
  );
}
