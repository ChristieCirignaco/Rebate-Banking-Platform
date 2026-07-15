import type { Metadata } from "next";

import { TwoFactorChallengeForm } from "@/components/auth/two-factor-challenge-form";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Two-factor authentication" };

// The 2FA sign-in challenge. There is NO session yet at this point — the challenge is
// carried by a signed "two_factor" cookie the browser sends automatically — so this page
// intentionally does not gate on a session.
export default async function TwoFactorPage() {
  const branding = await getSettings("branding");

  return <TwoFactorChallengeForm logoUrl={branding.logoLight} />;
}
