import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { PasswordForm } from "@/components/account/password-form";
import { TransactionPinForm } from "@/components/account/transaction-pin-form";
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
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg lg:dark:bg-slate-900">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/settings"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Security
            </h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              Manage how you sign in and protect your account.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <PasswordForm hasPassword={Boolean(credential)} />
          <TwoFactorSetup initialEnabled={dbUser?.twoFactorEnabled ?? false} />
          <TransactionPinForm hasPin={Boolean(dbUser?.transactionPin)} />
        </div>
      </div>
    </div>
  );
}
