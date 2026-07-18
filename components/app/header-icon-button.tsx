"use client";

import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// One shape for every action in a dashboard header: a round icon button with a tooltip. It
// exists so the chat button, the wallet "add" button, and any future header action read as one
// family instead of a mix of text pills and icons. The two variants match NotificationBell's, so
// a header row of these lines up with the bell pixel-for-pixel.
//
//   hero    — on the mobile home gradient (translucent white)
//   surface — on a light bar: the desktop header
//   muted   — the slate pill used by inner-page mobile headers, matching their back button so a
//             page's back / action / chat controls read as one set
export const HEADER_ICON_VARIANTS = {
  hero: "bg-white/10 text-white hover:bg-white/20",
  surface:
    "bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
  muted:
    "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
  // A page's primary action (e.g. "add wallet") — carries the accent so it still reads as the
  // main thing to do even as an icon.
  primary: "bg-blue-600 text-white hover:bg-blue-700",
} as const;

export type HeaderIconVariant = keyof typeof HEADER_ICON_VARIANTS;

const BASE =
  "relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50";

// A small pulsing dot, top-right. Signals "there's something here" — used on the chat button so
// it reads as a live, available channel rather than an inert icon.
function IndicatorDot() {
  return (
    <span aria-hidden className="absolute -top-0.5 -right-0.5 flex size-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
    </span>
  );
}

export const HeaderIconButton = forwardRef<
  HTMLButtonElement,
  {
    label: string; // tooltip text AND aria-label — one control, one name
    children: ReactNode; // the icon
    variant?: HeaderIconVariant;
    onClick?: () => void;
    disabled?: boolean;
    indicator?: boolean;
    type?: "button" | "submit";
    className?: string;
  }
>(function HeaderIconButton(
  { label, children, variant = "surface", onClick, disabled, indicator, type = "button", className },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type={type}
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className={cn(BASE, HEADER_ICON_VARIANTS[variant], className)}
        >
          {children}
          {indicator ? <IndicatorDot /> : null}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});
