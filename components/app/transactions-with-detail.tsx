"use client";

import { useRef, useState } from "react";

import { loadTransactionDetail } from "@/app/(app)/transactions/actions";
import type { TransactionGroup } from "@/lib/dashboard/transactions";
import type { TransactionDetail } from "@/lib/transaction-detail";
import { TransactionDetailModal } from "@/components/app/transaction-detail-modal";
import { TransactionsList } from "@/components/app/transactions-list";

// A ledger list whose rows open the details modal. This is the one place the row-click →
// fetch → modal wiring lives, so Home and History behave identically instead of Home rendering
// inert rows (which is what it did before — TransactionsList without `onSelect` degrades to
// plain divs, so the dashboard list looked clickable-ish but wasn't).
//
// Home is a server component, so the interactive part has to be its own client island; keeping
// it this small means the dashboard doesn't ship its hero/stats to the client just to make
// rows tappable.
export function TransactionsWithDetail({ groups }: { groups: TransactionGroup[] }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);

  // Row click → open the modal immediately (with a loading state) and fetch the full detail via
  // the server action. A per-request guard prevents a slow response from replacing a newer one.
  const latest = useRef(0);
  function onSelect(id: string) {
    const seq = ++latest.current;
    setDetail(null);
    setOpen(true);
    void loadTransactionDetail(id).then((d) => {
      if (seq === latest.current) setDetail(d);
    });
  }

  return (
    <>
      <TransactionsList groups={groups} onSelect={onSelect} />
      <TransactionDetailModal open={open} onOpenChange={setOpen} detail={detail} />
    </>
  );
}
