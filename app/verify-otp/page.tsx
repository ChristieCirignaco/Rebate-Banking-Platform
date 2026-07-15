import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { getSession, isAdminTierRole } from "@/lib/auth-guards";
import { ensureLoginOtpCode, needsLoginOtpVerification } from "@/lib/login-otp";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Verify it's you" };

export default async function VerifyOtpPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Admins never go through the user login-OTP gate.
  if (isAdminTierRole(session.user.role)) redirect("/admin");
  // Already verified (or the gate is off) — this step is done.
  if (!(await needsLoginOtpVerification(session.session.id, session.user.role))) {
    redirect("/dashboard");
  }

  // Mint + email the code here, where the session is guaranteed to exist. Idempotent, so a
  // refresh or double render won't spam a second email while a live code is outstanding.
  await ensureLoginOtpCode(session.session.id, session.user.id, session.user.email);

  const branding = await getSettings("branding");

  return <VerifyOtpForm logoUrl={branding.logoLight} email={session.user.email} />;
}
