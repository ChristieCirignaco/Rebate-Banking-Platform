"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, LogOut, Menu, X } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { APP_NAV } from "@/components/app/app-nav";

const DRAWER_GRADIENT = "linear-gradient(180deg,#1e293b 0%,#0f172a 100%)";

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "U";
}

type MenuUser = { name: string; email: string; image: string | null | undefined };

// The mobile hamburger + slide-out drawer, built on Vaul (shadcn Drawer, direction="left") so it
// drags-to-dismiss on touch. Styled to our dark gradient panel — not the raw shadcn look — and
// mirrors the desktop sidebar (full nav + user card + sign-out) so mobile reaches everything the
// bottom tab bar doesn't cover. Shown only within the mobile header; desktop uses the fixed sidebar.
export function MobileMenu({ user, triggerClassName }: { user: MenuUser; triggerClassName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      window.location.href = "/login";
    });
  }

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" aria-label="Open menu" className={triggerClassName}>
          <Menu className="size-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent
        className="text-white shadow-xl"
        style={{ width: "18rem", background: DRAWER_GRADIENT, border: "none", borderRadius: 0 }}
      >
        <DrawerDescription className="sr-only">Main navigation</DrawerDescription>

        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
              <Landmark className="size-5" />
            </span>
            <DrawerTitle className="text-base font-bold text-white">Rebate Bank</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close menu"
              className="flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </DrawerClose>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {APP_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <DrawerClose asChild key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </Link>
              </DrawerClose>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 border-t border-white/10 p-3">
          <DrawerClose asChild>
            <Link
              href="/settings"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition-colors hover:bg-white/10"
            >
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
            </Link>
          </DrawerClose>
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
      </DrawerContent>
    </Drawer>
  );
}
