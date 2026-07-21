"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { cmsText, type CmsComponentData } from "@/lib/cms/types";
import type { MenuLink } from "@/lib/home/menu";

export function SiteHeader({
  logoUrl,
  brandName,
  nav,
  menu,
}: {
  logoUrl: string;
  brandName: string;
  nav: CmsComponentData | null;
  menu: MenuLink[];
}) {
  const NAV = menu; // { label, href, openInNew }[]
  const signInLabel = cmsText(nav?.content ?? {}, "signInLabel", "Sign in");
  const joinLabel = cmsText(nav?.content ?? {}, "joinLabel", "Join Now");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // hide when scrolling down past the hero, show when scrolling up
      setHidden(y > 160 && y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-transform duration-300",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div
        className={cn(
          "transition-colors duration-300",
          scrolled ? "bg-[var(--trb-dark)]/90 backdrop-blur-md shadow-lg shadow-black/30" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center" aria-label={`${brandName} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={brandName} className="h-9 w-auto" />
          </Link>

          {/* desktop pill nav */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur-sm lg:flex">
            {NAV.map((item, i) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={i}
                  href={item.href}
                  target={item.openInNew ? "_blank" : undefined}
                  rel={item.openInNew ? "noreferrer" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "bg-white/15 text-white" : "text-white/80 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* desktop CTAs */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link href="/login" className="text-sm font-medium text-white/85 transition-colors hover:text-white">
              {signInLabel}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--trb-dark)] transition-colors hover:bg-[#e2e8f0]"
            >
              {joinLabel}
            </Link>
          </div>

          {/* mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-[var(--trb-dark)]/98 backdrop-blur-md lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {NAV.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                onClick={() => setOpen(false)}
                target={item.openInNew ? "_blank" : undefined}
                rel={item.openInNew ? "noreferrer" : undefined}
                className="rounded-lg px-4 py-3 text-base font-medium text-white/85 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center gap-3 px-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-medium text-white"
              >
                {signInLabel}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-[var(--trb-dark)]"
              >
                {joinLabel}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
