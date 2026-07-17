import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";

import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { PasswordForm } from "@/components/account/password-form";
import { TransactionPinForm } from "@/components/account/transaction-pin-form";
import { UserSignOutButton } from "@/components/user-sign-out-button";
import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Security" };

// Authenticated account page for enrolling in / managing two-factor authentication.
export default async function SecurityPage() {
  // Same full gate as the dashboard: active account + email-OTP cleared.
  const { session } = await requireActiveUser();

  const [dbUser, credential] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true, transactionPin: true },
    }),
    // Better Auth stores the password on the credential account row, not on User — its absence
    // is what "signs in without a password" means, so the card needs this rather than a User field.
    prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "credential" },
      select: { id: true },
    }),
  ]);

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

        <PasswordForm hasPassword={Boolean(credential)} />
        <TwoFactorSetup initialEnabled={dbUser?.twoFactorEnabled ?? false} />
        <TransactionPinForm hasPin={Boolean(dbUser?.transactionPin)} />
      </main>
    </div>
  );
}
