"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, House, LogOut, Package, Receipt, Settings, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SIDEBAR_GRADIENT = "linear-gradient(180deg,#1e293b 0%,#0f172a 100%)";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/products", label: "Products", icon: Package },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/statistic", label: "Statistic", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
];

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "U";
}

type SidebarUser = { name: string; email: string; image: string | null | undefined };

// The desktop-only left navigation rail (shown at lg+). Dark navy gradient to echo the
// mobile hero, blue-tinted active state, and the signed-in user + sign-out at the foot.
export function DesktopSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      // Full load: avoids the router-wedge after an awaited auth call and guarantees a clean
      // re-render at the login page.
      window.location.href = "/login";
    });
  }

  return (
    <aside
      className="hidden w-56 shrink-0 flex-col rounded-2xl text-white lg:flex lg:h-full"
      style={{ background: SIDEBAR_GRADIENT }}
    >
      <nav className="flex-1 space-y-1 px-3 pt-5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <Avatar size="default" className="ring-2 ring-white/15">
          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
          <AvatarFallback className="bg-white/15 text-xs font-semibold text-white">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-white/60">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          aria-label="Sign out"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
