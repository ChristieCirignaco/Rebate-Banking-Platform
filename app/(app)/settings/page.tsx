import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { UserSignOutButton } from "@/components/user-sign-out-button";

export const metadata: Metadata = { title: "Settings" };

const LINKS: { href: string; icon: LucideIcon; label: string; description: string }[] = [
  { href: "/account/profile", icon: UserRound, label: "Profile", description: "Your personal details" },
  {
    href: "/account/security",
    icon: ShieldCheck,
    label: "Security",
    description: "Password, two-factor, and login",
  },
];

// Settings tab — a hub into the account pages that already exist, inside the app shell so the
// bottom nav stays. More settings screens follow in later passes.
export default function SettingsPage() {
  return (
    <div className="flex min-h-svh flex-col px-5 pb-28">
      <header className="py-4">
        <h1 className="text-center text-base font-bold text-slate-900 dark:text-white">Settings</h1>
      </header>

      <div className="mt-2 flex flex-col gap-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
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

      <div className="mt-6 flex justify-center">
        <UserSignOutButton />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        More settings coming soon.
      </p>
    </div>
  );
}
