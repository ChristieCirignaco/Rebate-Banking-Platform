import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// The mobile-first "device" frame. Full-bleed on phones; on wider screens the *same* mobile
// UI is centered as a phone-width column on a dark pinstriped backdrop — so desktop is the
// mobile styling centered, not a re-laid-out desktop view (per design).
export function AppFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className="relative min-h-svh w-full"
      style={{ background: "linear-gradient(180deg,#0b1220 0%,#141d31 100%)" }}
    >
      {/* Subtle vertical pinstripe — only shows on desktop, where the column doesn't fill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-[0.05] sm:block"
        style={{ backgroundImage: "repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 24px)" }}
      />
      <div
        className={cn(
          "relative mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-white shadow-2xl shadow-black/40 dark:bg-slate-950",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
