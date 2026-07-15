import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Landmark, ShieldCheck, Wallet } from "lucide-react";

import { UserSignOutButton } from "@/components/user-sign-out-button";
import { Button } from "@/components/ui/button";
import { getSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { needsLoginOtpVerification } from "@/lib/login-otp";
import { toMajor } from "@/lib/money/money";

export const metadata: Metadata = { title: "Dashboard" };

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  NGN: "Nigerian Naira",
  USDT: "Tether",
};

// Minimal authenticated user dashboard — enough to prove the login flow end to end. The
// full user experience is a later build. Admins are bounced to the admin panel: this area
// is for regular users only.
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/dashboard");
  if (isAdminTierRole(session.user.role)) redirect("/admin");
  // "Email OTP on login" gate: block the dashboard until the emailed code is entered.
  if (await needsLoginOtpVerification(session.session.id, session.user.role)) {
    redirect("/verify-otp");
  }

  const wallets = await prisma.wallet.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
  });
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="bg-muted/30 min-h-svh">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
              <Landmark className="size-4" />
            </div>
            <span className="font-semibold">Rebate Bank</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/account/security">
                <ShieldCheck className="size-4" />
                Security
              </Link>
            </Button>
            <UserSignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-muted-foreground text-sm">Here&apos;s a quick look at your wallets.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border bg-background p-6 text-sm">
              No wallets yet.
            </div>
          ) : (
            wallets.map((wallet) => (
              <div key={wallet.id} className="bg-background flex flex-col gap-3 rounded-xl border p-5">
                <div className="flex items-center justify-between">
                  <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
                    <Wallet className="size-4" />
                  </div>
                  {wallet.isDefault ? (
                    <span className="bg-emerald-500/12 rounded-full px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Default
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrency(toMajor(wallet.balanceMinor), wallet.currency)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {CURRENCY_NAMES[wallet.currency] ?? wallet.currency}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          Your full dashboard — claims, deposits, withdrawals, and KYC — is coming soon.
        </div>
      </main>
    </div>
  );
}
