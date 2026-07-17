import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  BadgeCheck,
  ChevronRight,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { UserSignOutButton } from "@/components/user-sign-out-button";
import { getEnabledFlags } from "@/lib/settings/feature-flags";
import type { FeatureFlagKey } from "@/lib/settings/feature-flags";

export const metadata: Metadata = { title: "Settings" };

// `flag` omitted = always shown. Profile, Security and Notifications have no flag because
// there is none to have: they aren't switchable features, they're the account itself.
type SettingsLink = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  flag?: FeatureFlagKey;
};

const LINKS: SettingsLink[] = [
  { href: "/account/profile", icon: UserRound, label: "Profile", description: "Your personal details" },
  {
    href: "/account/security",
    icon: ShieldCheck,
    label: "Security",
    description: "Password, transaction PIN and two-factor",
  },
  {
    href: "/kyc",
    icon: BadgeCheck,
    label: "Identity Verification",
    description: "Submit your documents and track approval",
    flag: "kyc_submission",
  },
  {
    href: "/wallet",
    icon: Wallet,
    label: "Wallets",
    description: "Your balances and activity",
    flag: "wallets",
  },
  {
    href: "/notifications",
    icon: Bell,
    label: "Notifications",
    description: "Messages from the team",
  },
];

function SettingsLinks({ links }: { links: SettingsLink[] }) {
  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{link.label}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {link.description}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-slate-300 dark:text-slate-600" />
          </Link>
        );
      })}
    </div>
  );
}

// Settings hub into the existing account pages. Mobile: light stacked list. Desktop: a
// dark-scoped card in the dark content panel.
//
// Flag-filtered like every other nav surface. This was the one that wasn't: the sidebar, the
// mobile drawer and the bottom tab bar all filter through visibleNav(), while this list was
// static — so turning off Wallets or KYC in /admin left rows here that walked the user into a
// redirect back to the dashboard, which reads as a broken link rather than a disabled feature.
export default async function SettingsPage() {
  const enabled = await getEnabledFlags();
  const links = LINKS.filter((link) => !link.flag || enabled.has(link.flag));

  return (
    <>
      {/* Mobile */}
      <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-5 pb-28 lg:hidden">
        <header className="py-4">
          <h1 className="text-center text-base font-bold text-slate-900 dark:text-white">Settings</h1>
        </header>
        <SettingsLinks links={links} />
        <div className="mt-6 flex justify-center">
          <UserSignOutButton />
        </div>
      </div>

      {/* Desktop */}
      <div className="dark hidden lg:block">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <SettingsLinks links={links} />
            <div className="mt-6">
              <UserSignOutButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
