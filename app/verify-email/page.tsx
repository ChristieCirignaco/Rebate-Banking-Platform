import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage() {
  const branding = await getSettings("branding");

  // VerifyEmailForm reads ?error=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <VerifyEmailForm logoUrl={branding.logoLight} />
    </Suspense>
  );
}
