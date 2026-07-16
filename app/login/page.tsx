import type { Metadata } from "next";
import { Suspense } from "react";

import { UserLoginForm } from "@/components/user-login-form";
import { redirectIfAuthenticated } from "@/lib/auth-guards";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in? Admins belong in the panel; an ACTIVE regular user goes to their
  // dashboard. A pending/suspended session stays here to see its inline notice.
  await redirectIfAuthenticated();

  const branding = await getSettings("branding");

  // UserLoginForm reads ?redirect=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <UserLoginForm logoUrl={branding.logoLight} />
    </Suspense>
  );
}
