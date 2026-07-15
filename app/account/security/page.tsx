import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";

import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { UserSignOutButton } from "@/components/user-sign-out-button";
import { getSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { needsLoginOtpVerification } from "@/lib/login-otp";

export const metadata: Metadata = { title: "Security" };

// Authenticated account page for enrolling in / managing two-factor authentication.
export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/account/security");
  // Same "email OTP on login" gate as the dashboard — clear it before any user page.
  if (await needsLoginOtpVerification(session.session.id, session.user.role)) {
    redirect("/verify-otp");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });

  return (
    <div className="bg-muted/30 min-h-svh">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
              <Landmark className="size-4" />
            </div>
            <span className="font-semibold">Rebate Bank</span>
          </div>
          <UserSignOutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
          <p className="text-muted-foreground text-sm">
            Manage how you sign in and protect your account.
          </p>
        </div>

        <TwoFactorSetup initialEnabled={dbUser?.twoFactorEnabled ?? false} />
      </main>
    </div>
  );
}
