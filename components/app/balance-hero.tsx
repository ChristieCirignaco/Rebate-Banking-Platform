"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BalanceDelta } from "@/lib/dashboard/transactions";

const STORAGE_KEY = "rb_balance_hidden";

// Read the "hide balance" preference from localStorage as an external store. useSyncExternalStore
// serves the server snapshot (false) during SSR/hydration and then swaps to the client value with
// no hydration mismatch and no setState-in-effect. Same-tab toggles notify via a synthetic
// storage event; cross-tab changes arrive through the native one.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function useBalanceHidden(): [boolean, () => void] {
  const hidden = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY) === "1",
    () => false,
  );
  const toggle = useCallback(() => {
    const next = localStorage.getItem(STORAGE_KEY) === "1" ? "0" : "1";
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);
  return [hidden, toggle];
}

// "Total Balance" hero: the default wallet balance with an eye toggle to hide/show it
// (remembered in localStorage) and the 30-day change below.
export function BalanceHero({
  balanceLabel,
  delta,
}: {
  balanceLabel: string;
  delta: BalanceDelta | null;
}) {
  const [hidden, toggle] = useBalanceHidden();

  return (
    <div className="mt-6">
      <p className="text-sm text-white/70">Total Balance</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-4xl font-bold tracking-tight text-white tabular-nums">
          {hidden ? "••••••" : balanceLabel}
        </p>
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {delta && !hidden ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-medium text-white/85 tabular-nums">{delta.label}</span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-semibold",
              delta.positive
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300",
            )}
          >
            {delta.percentLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
