"use client";

import { LogIn } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { ManageFundsDialog } from "./dialogs/manage-funds-dialog";
import { NotifyUserDialog } from "./dialogs/notify-user-dialog";
import { TransferCodesDialog } from "./dialogs/transfer-codes-dialog";
import { WithdrawalControlDialog } from "./dialogs/withdrawal-control-dialog";
import type {
  DetailWallet,
  ManageFundsPayload,
  NotifyPayload,
  TransferCodes,
  UserDetail,
  WithdrawalControlPayload,
} from "./types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserProfilePanel({
  user,
  wallets,
  transferCodes,
  onLoginAsUser,
  onNotify,
  onManageFunds,
  onSaveTransferCodes,
  onWithdrawalControl,
}: {
  user: UserDetail;
  wallets: DetailWallet[];
  transferCodes: TransferCodes;
  onLoginAsUser: () => void;
  onNotify: (payload: NotifyPayload) => void;
  onManageFunds: (payload: ManageFundsPayload) => Promise<boolean>;
  onSaveTransferCodes: (codes: TransferCodes) => void;
  onWithdrawalControl: (payload: WithdrawalControlPayload) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <Avatar className="size-20">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} />
          ) : null}
          <AvatarFallback className="text-xl">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-muted-foreground text-sm">{user.country}</p>
        </div>

        <div className="text-muted-foreground w-full space-y-1 text-xs">
          <p>
            Last Login:{" "}
            {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
          </p>
          <p>Browser: {user.browser}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <NotifyUserDialog user={user} onSend={onNotify} />
          <ManageFundsDialog
            user={user}
            wallets={wallets}
            onUpdateBalance={onManageFunds}
          />
          <TransferCodesDialog
            user={user}
            initialCodes={transferCodes}
            onSave={onSaveTransferCodes}
          />
          <WithdrawalControlDialog
            user={user}
            onUpdateStatus={onWithdrawalControl}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Login as User"
            aria-label="Login as User"
            className="size-10 rounded-full border text-slate-600 hover:bg-slate-500/10 dark:text-slate-300"
            onClick={onLoginAsUser}
          >
            <LogIn className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
