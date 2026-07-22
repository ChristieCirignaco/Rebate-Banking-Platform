"use client";

import { useRef, useState } from "react";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { ActionIconButton } from "../shared";
import type {
  BalanceOp,
  DetailWallet,
  ManageFundsPayload,
  UserDetail,
} from "../types";

export function ManageFundsDialog({
  user,
  wallets,
  onUpdateBalance,
}: {
  user: UserDetail;
  wallets: DetailWallet[];
  onUpdateBalance: (payload: ManageFundsPayload) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [walletCurrency, setWalletCurrency] = useState("");
  const [op, setOp] = useState<BalanceOp>("credit");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [pending, setPending] = useState(false);
  // One nonce per in-flight adjustment: reused if a submit is retried, reset on success.
  const requestIdRef = useRef<string | null>(null);

  const selectedWallet = wallets.find(
    (wallet) => wallet.currency === walletCurrency,
  );

  async function handleUpdate() {
    if (!selectedWallet || pending) return;
    if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID();
    setPending(true);
    // finally so a thrown/rejected action (e.g. a network failure, not an ActionResult error)
    // still clears `pending` — otherwise the button freezes on "Updating…" and blocks the retry
    // the request nonce was built to make safe.
    try {
      const ok = await onUpdateBalance({
        walletCurrency,
        op,
        description: description || undefined,
        amount: Number(amount) || 0,
        adminNote: adminNote || undefined,
        requestId: requestIdRef.current,
      });
      if (ok) {
        requestIdRef.current = null;
        setOpen(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ActionIconButton icon={Coins} tint="emerald" fill label="Manage Funds" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modify User Balance</DialogTitle>
          <DialogDescription>
            Credit or debit {user.name}&apos;s wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Select Wallet</Label>
            <Select value={walletCurrency} onValueChange={setWalletCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.currency} value={wallet.currency}>
                    {wallet.name} ({wallet.currency}) - Balance:{" "}
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Transaction Type</Label>
            <RadioGroup
              value={op}
              onValueChange={(value) => setOp(value as BalanceOp)}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="credit" id="op-credit" />
                <Label htmlFor="op-credit" className="font-normal">
                  Credit
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="debit" id="op-debit" />
                <Label htmlFor="op-debit" className="font-normal">
                  Debit
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="funds-description">Transaction Description</Label>
            <Input
              id="funds-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
            />
            <p className="text-muted-foreground text-xs">
              This will appear on user&apos;s transaction receipt/PDF. Leave
              empty for default description.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="funds-amount">Amount</Label>
            <div className="relative">
              <Input
                id="funds-amount"
                type="number"
                min="0"
                step="0.01"
                disabled={!selectedWallet}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={
                  selectedWallet
                    ? `0.00 ${selectedWallet.currency}`
                    : "Select wallet first"
                }
                className={selectedWallet ? "pr-14" : undefined}
              />
              {selectedWallet ? (
                <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium">
                  {selectedWallet.currency}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {selectedWallet
                ? `Current balance: ${formatCurrency(selectedWallet.balance, selectedWallet.currency)}`
                : "Current balance will be shown here."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="funds-note">Admin Note (optional)</Label>
            <Textarea
              id="funds-note"
              rows={2}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              This note will be visible to the user in their transaction
              details.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpdate}
            disabled={!selectedWallet || !amount || pending}
          >
            {pending ? "Updating…" : "Update Balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
