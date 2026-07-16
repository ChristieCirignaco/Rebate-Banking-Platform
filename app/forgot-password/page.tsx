import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth-guards";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  // A signed-in user doesn't need to reset their password from the public flow.
  await redirectIfAuthenticated();

  const branding = await getSettings("branding");

  return <ForgotPasswordForm logoUrl={branding.logoLight} />;
}
