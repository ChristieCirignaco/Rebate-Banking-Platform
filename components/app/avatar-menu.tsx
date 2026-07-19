"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import useMeasure from "react-use-measure";
import { LogOut, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// The account menu behind the header avatar. Same uselayouts "smooth-dropdown" morph as the
// bottom bar's nav menu (uselayouts.com/docs/components/smooth-dropdown): ONE element springs
// its own width/height/radius from the trigger footprint into the panel, the trigger fading out
// as the measured content fades and staggers in. Here the collapsed footprint is the avatar, so
// the radius animates from a full circle to the card's 16px.
//
// `align` is which edge it grows from — the desktop header's avatar sits at the right, the
// mobile hero's at the left, and a panel anchored to the wrong edge would run off-screen.

const easeOutQuint = [0.23, 1, 0.32, 1] as const;

const OPEN_W = 244;

const LINKS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/account/profile", icon: UserRound, label: "Profile" },
  { href: "/account/security", icon: ShieldCheck, label: "Security" },
  { href: "/settings", icon: SlidersHorizontal, label: "Settings" },
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

export function AvatarMenu({
  name,
  email,
  image,
  align = "right",
  size = 32,
  triggerRingClassName,
  avatarFallbackClassName,
}: {
  name: string;
  email: string;
  image: string | null | undefined;
  align?: "left" | "right";
  /** Collapsed footprint in px — matches the avatar it replaces (32 desktop, 40 mobile hero). */
  size?: number;
  triggerRingClassName?: string;
  avatarFallbackClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  // Measures the (always-rendered) content so the container can morph to its exact height.
  const [contentRef, contentBounds] = useMeasure();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      window.location.href = "/login";
    });
  }

  const openHeight = Math.max(size, Math.ceil(contentBounds.height));

  return (
    <div
      ref={containerRef}
      className="relative z-50 shrink-0"
      style={{ width: size, height: size }}
    >
      <motion.div
        initial={false}
        animate={{
          width: open ? OPEN_W : size,
          height: open ? openHeight : size,
          borderRadius: open ? 16 : size / 2,
        }}
        transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.8 }}
        style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
        className={cn(
          "absolute top-0 overflow-hidden",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        {/* Card surface — fades in as the element grows, so the collapsed state reads as a bare
            avatar and the open state as a panel, all one morphing element. */}
        <motion.div
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        />

        {/* Collapsed trigger — the avatar, fades out on open. */}
        <motion.div
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          style={{ pointerEvents: open ? "none" : "auto" }}
          className="absolute inset-0"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Account menu"
            className="size-full cursor-pointer rounded-full"
          >
            <Avatar className={cn("size-full", triggerRingClassName)}>
              {image ? <AvatarImage src={image} alt="" /> : null}
              <AvatarFallback
                className={cn(
                  "text-xs font-semibold text-white",
                  avatarFallbackClassName ?? "bg-blue-600",
                )}
              >
                {initials(name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </motion.div>

        {/* Panel content — measured (so the morph targets its height), fades + staggers in.
            This wrapper is always rendered (that's what makes it measurable) and, being later
            in DOM order, paints over the collapsed avatar — so it MUST NOT take pointer events
            while closed, or it swallows the click that opens the menu. */}
        <div
          ref={contentRef}
          className="relative"
          style={{ pointerEvents: open ? "auto" : "none" }}
        >
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.2, delay: open ? 0.08 : 0 }}
            style={{ pointerEvents: open ? "auto" : "none", width: OPEN_W }}
            className="max-h-[70dvh] overflow-y-auto overscroll-contain p-2"
          >
            <div className="flex items-center gap-2.5 p-1.5">
              <Avatar size="lg" className="ring-1 ring-slate-200 dark:ring-slate-700">
                {image ? <AvatarImage src={image} alt="" /> : null}
                <AvatarFallback className="bg-blue-600 text-xs font-semibold text-white">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              {/* Name + email are PII — kept out of the translator. */}
              <div translate="no" className="notranslate min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {name}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {email}
                </p>
              </div>
            </div>

            <hr className="my-2 border-slate-100 dark:border-slate-800" />

            <ul className="flex flex-col gap-0.5">
              {LINKS.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.li
                    key={link.href}
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, x: open ? 0 : 8 }}
                    transition={{
                      delay: open ? 0.06 + index * 0.02 : 0,
                      duration: 0.15,
                      ease: easeOutQuint,
                    }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Icon className="size-[18px]" />
                      {link.label}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>

            <hr className="my-2 border-slate-100 dark:border-slate-800" />

            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOut className="size-[18px]" />
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
