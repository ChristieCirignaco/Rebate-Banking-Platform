"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { searchTransactions } from "@/app/(app)/search/actions";
import { loadTransactionDetail } from "@/app/(app)/transactions/actions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
// Type-only: both modules import Prisma at runtime, and a client component that pulls a runtime
// value out of a prisma-importing lib crashes with a ZodError from lib/env. `import type` is
// erased at compile time, so nothing server-side reaches the bundle.
import type { TransactionDetail } from "@/lib/transaction-detail";
import type { TransactionSearchResult } from "@/lib/user-search";
import { TransactionDetailModal } from "@/components/app/transaction-detail-modal";
import { TXN_ICONS } from "@/components/app/transaction-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";

// The desktop header's existing search controls, matched class-for-class so dropping this in
// changes behavior only — never layout.
const PILL =
  "hidden h-10 w-56 items-center gap-2 rounded-full bg-white px-4 text-sm text-slate-400 shadow-sm transition-colors hover:bg-slate-100 xl:flex dark:bg-slate-800 dark:hover:bg-slate-700";
const ICON_BTN =
  "relative flex size-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2; // mirrors SEARCH_MIN_QUERY — the server is still the authority

// Self-contained transaction search: trigger + dialog + results + the SAME details modal the
// history list opens (via the same server action and resolver), so there is exactly one
// transaction-detail surface in the app. No required props — drop it into either header.
//
// variant "header" renders BOTH desktop triggers (the wide pill at xl+, the icon button below
// xl) sharing one dialog; "icon" renders a single icon button for the mobile header.
export function TransactionSearch({
  variant = "header",
  className,
}: {
  variant?: "header" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TransactionSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);

  // Per-request guards: a slow response must never overwrite a newer one (same pattern as
  // components/app/transaction-filters.tsx).
  const searchSeq = useRef(0);
  const detailSeq = useRef(0);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY;

  // Debounced search. Re-running on `trimmed` means typing then deleting back to the same text
  // doesn't refetch, and the cleanup cancels the pending timer on every keystroke.
  useEffect(() => {
    if (!open) return;
    if (tooShort) {
      searchSeq.current += 1; // strand any in-flight response
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      void searchTransactions(trimmed)
        .then((rows) => {
          if (seq !== searchSeq.current) return;
          setResults(rows);
          setLoading(false);
        })
        .catch(() => {
          if (seq !== searchSeq.current) return;
          setResults([]);
          setLoading(false);
          toast.error("Couldn't search right now. Please try again.");
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, tooShort, open]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Reset on close (Escape, overlay click, or the X) so the next open starts clean.
    if (!next) {
      searchSeq.current += 1;
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }

  // Open the shared details modal for a result — same server action, same resolver, same modal
  // the history list uses. Closes the search dialog first so only one is ever on screen.
  function onSelect(id: string) {
    const seq = ++detailSeq.current;
    onOpenChange(false);
    setDetail(null);
    setDetailOpen(true);
    void loadTransactionDetail(id)
      .then((d) => {
        if (seq === detailSeq.current) setDetail(d);
      })
      .catch(() => {
        if (seq !== detailSeq.current) return;
        setDetailOpen(false);
        toast.error("Couldn't open that transaction.");
      });
  }

  // Enter opens the first result. Escape is handled natively by the Dialog.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = results[0];
    if (first) onSelect(first.id);
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Search transactions"
          onClick={() => setOpen(true)}
          className={className ?? ICON_BTN}
        >
          <Search className="size-5" />
        </button>
      ) : (
        <>
          <button
            type="button"
            aria-label="Search transactions"
            onClick={() => setOpen(true)}
            className={cn(PILL, className)}
          >
            <Search className="size-4 shrink-0" />
            <span>Search…</span>
          </button>
          <button
            type="button"
            aria-label="Search transactions"
            onClick={() => setOpen(true)}
            className={cn("xl:hidden", ICON_BTN)}
          >
            <Search className="size-5" />
          </button>
        </>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search transactions</DialogTitle>
            <DialogDescription>
              Search your ledger by description, type, transaction code or currency.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search transactions…"
            aria-label="Search transactions"
            className={cn(FIELD, "w-full")}
          />

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
                <Loader2 className="size-5 animate-spin" />
                <p className="text-sm">Searching…</p>
              </div>
            ) : tooShort ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Type at least {MIN_QUERY} characters to search.
              </p>
            ) : results.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                No matching transactions
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {results.map((row) => {
                  const Icon = TXN_ICONS[row.iconKey];
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full",
                          row.positive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.title}
                        </p>
                        <p className="truncate text-xs text-slate-400">{row.dateLabel}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-bold tabular-nums",
                          row.positive ? "text-emerald-600" : "text-red-600",
                        )}
                      >
                        {row.amountLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDetailModal open={detailOpen} onOpenChange={setDetailOpen} detail={detail} />
    </>
  );
}
