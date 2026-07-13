"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, ListOrdered, Share2, User } from "lucide-react";

import {
  manageFunds,
  notifyUser,
  saveTransferCodes,
  toggleControl,
  updateUserInfo,
  updateWithdrawalControl,
  type ActionResult,
} from "@/app/admin/users/[id]/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { UserControls } from "./user-controls";
import { UserProfilePanel } from "./user-profile-panel";
import { WalletList } from "./wallet-list";
import { UserActivityTab } from "./tabs/user-activity-tab";
import { UserInfoTab } from "./tabs/user-info-tab";
import { UserReferralsTab } from "./tabs/user-referrals-tab";
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
  wallets,
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
  wallets: DetailWallet[];
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <UserProfilePanel
          user={user}
          wallets={wallets}
          transferCodes={transferCodes}
          onLoginAsUser={() => toast("Login as user is available in a later phase.")}
          onNotify={(payload) => run(notifyUser(user.id, payload), "Notification sent")}
          onManageFunds={(payload) => run(manageFunds(user.id, payload), "Balance updated")}
          onSaveTransferCodes={(codes) => run(saveTransferCodes(user.id, codes), "Transfer codes saved")}
          onWithdrawalControl={(payload) =>
            run(updateWithdrawalControl(user.id, payload), "Withdrawal status updated")
          }
        />
        <WalletList wallets={wallets} />
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
        </Tabs>
      </div>
    </div>
  );
}
