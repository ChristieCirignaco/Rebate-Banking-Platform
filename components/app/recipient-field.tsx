"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import { lookupRecipient } from "@/app/(app)/send/actions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type Status = "idle" | "loading" | "found" | "notfound";

const FIELD_BASE =
  "h-11 w-full rounded-xl border bg-slate-50/70 pr-10 pl-10 text-base outline-none transition-colors dark:bg-slate-800/40";

// Internal-transfer recipient input with real-time verification: a search icon, a debounced
// lookup with a loading spinner, green success / red error feedback on the field (with a
// shake + toast when no user is found), and a confirmation of who the money is going to.
export function RecipientField({
  value,
  onChange,
  onStatusChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onStatusChange?: (found: boolean) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = value.trim().replace(/^@/, "");
    const mySeq = ++seq.current;

    // Defer the reset/loading write so it isn't a synchronous setState in the effect body.
    const kick = setTimeout(() => {
      if (mySeq !== seq.current) return;
      if (q.length < 3) {
        setStatus("idle");
        setName(null);
        onStatusChange?.(false);
      } else {
        setStatus("loading");
      }
    }, 0);

    if (q.length < 3) return () => clearTimeout(kick);

    const lookup = setTimeout(async () => {
      const res = await lookupRecipient(q);
      if (mySeq !== seq.current) return; // a newer keystroke superseded this lookup
      if (res.found) {
        setStatus("found");
        setName(res.name ?? null);
        onStatusChange?.(true);
        toast.success(`Recipient found${res.name ? `: ${res.name}` : ""}`);
      } else {
        setStatus("notfound");
        setName(null);
        onStatusChange?.(false);
        toast.error("No user found with that email or username.");
        const el = wrapRef.current;
        if (el) {
          el.classList.remove("animate-shake");
          void el.offsetWidth; // reflow so the animation can replay
          el.classList.add("animate-shake");
        }
      }
    }, 600);

    return () => {
      clearTimeout(kick);
      clearTimeout(lookup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const borderClass =
    status === "found"
      ? "border-emerald-500 bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500/20 dark:bg-emerald-500/5"
      : status === "notfound"
        ? "border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-500/20 dark:bg-red-500/5"
        : "border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:focus:bg-slate-900";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="recipient" className="text-sm font-semibold">
        Recipient (email or @username)
      </Label>
      <div ref={wrapRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          id="recipient"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="name@example.com"
          autoComplete="off"
          className={cn(FIELD_BASE, borderClass)}
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin text-slate-400 dark:text-slate-500" />
          ) : status === "found" ? (
            <Check className="size-4 text-emerald-500" />
          ) : status === "notfound" ? (
            <X className="size-4 text-red-500" />
          ) : null}
        </span>
      </div>
      {status === "found" && name ? (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Sending to {name}
        </p>
      ) : status === "notfound" ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">
          No matching user found.
        </p>
      ) : null}
    </div>
  );
}
