import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { UserLoginForm } from "@/components/user-login-form";
import { getAdminSession, getSession } from "@/lib/auth-guards";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in? Admins belong in the panel; a regular user goes to their dashboard.
  if (await getAdminSession()) redirect("/admin");
  if (await getSession()) redirect("/dashboard");

  const branding = await getSettings("branding");

  // UserLoginForm reads ?redirect=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <UserLoginForm logoUrl={branding.logoLight} />
    </Suspense>
  );
}
