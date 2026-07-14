"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleCurrencyStatus } from "@/app/admin/currencies/actions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// The Status cell doubles as the quick activate/deactivate toggle.
export function CurrencyStatusToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleCurrencyStatus(id, !active);
      if (result.ok) {
        toast.success(active ? "Currency deactivated" : "Currency activated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={active ? "Deactivate currency" : "Activate currency"}
      title={active ? "Deactivate currency" : "Activate currency"}
      className={cn(
        "cursor-pointer rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60",
        active
          ? "bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
          : "bg-rose-500/12 text-rose-700 hover:bg-rose-500/25 dark:text-rose-400",
      )}
    >
      {active ? "ACTIVATED" : "DEACTIVATED"}
    </button>
  );
}
