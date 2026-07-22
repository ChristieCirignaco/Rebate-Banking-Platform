"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Ban, BarChart3, ListOrdered, Share2, ShieldCheck, User } from "lucide-react";

import {
  adminSetUserAvatar,
  manageFunds,
  notifyUser,
  reactivateUser,
  saveTransferCodes,
  toggleControl,
  updateUserInfo,
  updateWithdrawalControl,
  type ActionResult,
} from "@/app/admin/users/[id]/actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { UserControls } from "./user-controls";
import { UserProfilePanel } from "./user-profile-panel";
import { WalletList } from "./wallet-list";
import { UserActivityTab } from "./tabs/user-activity-tab";
import { UserInfoTab } from "./tabs/user-info-tab";
import { UserReferralsTab } from "./tabs/user-referrals-tab";
import { UserSecurityTab } from "./tabs/user-security-tab";
import { UserStatsTab } from "./tabs/user-stats-tab";
import { UserTransactionsTab } from "./tabs/user-transactions-tab";
import type {
  ActivityEntry,
  ControlKey,
  DetailTransaction,
  DetailWallet,
  ReferralUser,
  TransferCodes,
  TxnSummaryPoint,
  UserControl,
  UserDetail,
} from "./types";

export function UserDetailView({
  user,
  canDelete,
  wallets,
  assignableCurrencies,
  walletSlotsLeft,
  controls: initialControls,
  statValues,
  statCurrency,
  txnSummary,
  transactions,
  referrals,
  activity,
  transferCodes,
}: {
  user: UserDetail;
  canDelete: boolean;
  wallets: DetailWallet[];
  assignableCurrencies: { code: string; name: string }[];
  walletSlotsLeft: number;
  controls: UserControl[];
  statValues: Record<string, number>;
  statCurrency: string;
  txnSummary: TxnSummaryPoint[];
  transactions: DetailTransaction[];
  referrals: ReferralUser[];
  activity: ActivityEntry[];
  transferCodes: TransferCodes;
}) {
  const router = useRouter();
  const [controls, setControls] = useState(initialControls);

  // Run an action, toast on success/failure, refresh on success. Returns whether it
  // succeeded so dialogs can stay open on error.
  async function run(action: Promise<ActionResult>, successMessage: string): Promise<boolean> {
    const result = await action;
    if (result.ok) {
      toast.success(successMessage);
      router.refresh();
      return true;
    }
    toast.error(result.error);
    return false;
  }

  async function handleToggle(key: ControlKey, value: boolean) {
    const label = controls.find((control) => control.key === key)?.label ?? "Setting";
    setControls((current) =>
      current.map((control) => (control.key === key ? { ...control, enabled: value } : control)),
    );
    const result = await toggleControl(user.id, key, value);
    if (result.ok) {
      toast.success(`${label} ${value ? "enabled" : "disabled"}`);
      router.refresh();
    } else {
      setControls((current) =>
        current.map((control) => (control.key === key ? { ...control, enabled: !value } : control)),
      );
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {user.accountStatus === "suspended" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Ban className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              This account is <strong>suspended</strong> — the user can&apos;t sign in.
            </span>
          </div>
          <Button size="sm" onClick={() => run(reactivateUser(user.id), "Account reactivated")}>
            Reactivate account
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <UserProfilePanel
          user={user}
          wallets={wallets}
          transferCodes={transferCodes}
          onLoginAsUser={async () => {
            // Impersonate: Better Auth mints a session for this user (impersonatedBy = admin),
            // stashes the admin's own session so it can be restored, and swaps the cookie. A full
            // navigation makes the new session take effect from the first request. Silent — the
            // user is not notified; the impersonation shows only in this page's Activity log.
            const { error } = await authClient.admin.impersonateUser({ userId: user.id });
            if (error) {
              toast.error(error.message || "Couldn't start impersonation.");
              return;
            }
            window.location.href = "/dashboard";
          }}
          onNotify={(payload) => run(notifyUser(user.id, payload), "Notification sent")}
          onManageFunds={(payload) => run(manageFunds(user.id, payload), "Balance updated")}
          onSaveTransferCodes={(codes) => run(saveTransferCodes(user.id, codes), "Transfer codes saved")}
          onWithdrawalControl={(payload) =>
            run(updateWithdrawalControl(user.id, payload), "Withdrawal status updated")
          }
        />
        <WalletList
          userId={user.id}
          wallets={wallets}
          assignable={assignableCurrencies}
          slotsLeft={walletSlotsLeft}
        />
        <UserControls controls={controls} onToggle={handleToggle} />
      </div>

      <div className="lg:col-span-2">
        <Tabs defaultValue="statistics" className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="statistics">
              <BarChart3 className="size-4" />
              <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="information">
              <User className="size-4" />
              <span className="hidden sm:inline">Information</span>
            </TabsTrigger>
            <TabsTrigger value="transaction">
              <ListOrdered className="size-4" />
              <span className="hidden sm:inline">Transaction</span>
            </TabsTrigger>
            <TabsTrigger value="referral">
              <Share2 className="size-4" />
              <span className="hidden sm:inline">Referral</span>
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="size-4" />
              <span className="hidden sm:inline">Activity Log</span>
            </TabsTrigger>
            <TabsTrigger value="security">
              <ShieldCheck className="size-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <UserStatsTab
              statValues={statValues}
              statCurrency={statCurrency}
              summary={txnSummary}
            />
          </TabsContent>
          <TabsContent value="information">
            <UserInfoTab
              user={user}
              onUpdate={(values) => run(updateUserInfo(user.id, values), "Information updated")}
              onChangeAvatar={(url) => run(adminSetUserAvatar(user.id, url), "Avatar updated")}
            />
          </TabsContent>
          <TabsContent value="transaction">
            <UserTransactionsTab transactions={transactions} />
          </TabsContent>
          <TabsContent value="referral">
            <UserReferralsTab referrals={referrals} />
          </TabsContent>
          <TabsContent value="activity">
            <UserActivityTab activity={activity} />
          </TabsContent>
          <TabsContent value="security">
            <UserSecurityTab user={user} canDelete={canDelete} />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
