import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const branding = await getSettings("branding");

  return <ForgotPasswordForm logoUrl={branding.logoLight} />;
}
