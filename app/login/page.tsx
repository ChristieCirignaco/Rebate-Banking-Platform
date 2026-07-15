import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { UserLoginForm } from "@/components/user-login-form";
import { getAdminSession, getSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in? Admins belong in the panel; an ACTIVE regular user goes to their
  // dashboard. A pending/suspended session must NOT be bounced — it stays here to see its
  // inline notice, otherwise it would loop with the dashboard status guard.
  if (await getAdminSession()) redirect("/admin");
  const session = await getSession();
  if (session && !isAdminTierRole(session.user.role)) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });
    if (user?.status === "active") redirect("/dashboard");
  }

  const branding = await getSettings("branding");

  // UserLoginForm reads ?redirect=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <UserLoginForm logoUrl={branding.logoLight} />
    </Suspense>
  );
}
