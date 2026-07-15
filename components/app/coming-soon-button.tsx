"use client";

import type { ReactNode } from "react";

import { toast } from "@/lib/toast";

// A stub trigger for features not built yet (Deposit, Transfer, search, bell, Add card, Pay
// Now). It looks like a real control but only shows a "coming soon" toast, so the design is
// fully interactive without wiring up flows that land in a later pass. Keeping this a tiny
// client component lets the surrounding sections stay server components.
export function ComingSoonButton({
  message,
  className,
  children,
  ariaLabel,
}: {
  message: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button type="button" aria-label={ariaLabel} className={className} onClick={() => toast(message)}>
      {children}
    </button>
  );
}
