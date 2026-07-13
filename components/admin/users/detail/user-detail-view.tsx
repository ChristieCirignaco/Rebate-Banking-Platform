"use client";

import { useState } from "react";
import { Activity, BarChart3, ListOrdered, Share2, User } from "lucide-react";

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
  txnSummary,
  transactions,
  referrals,
  activity,
  transferCodes,
}: {
  user: UserDetail;
  wallets: DetailWallet[];
  controls: UserControl[];
  txnSummary: TxnSummaryPoint[];
  transactions: DetailTransaction[];
  referrals: ReferralUser[];
  activity: ActivityEntry[];
  transferCodes: TransferCodes;
}) {
  const [controls, setControls] = useState(initialControls);

  function handleToggle(key: ControlKey, value: boolean) {
    setControls((current) =>
      current.map((control) =>
        control.key === key ? { ...control, enabled: value } : control,
      ),
    );
    const label =
      controls.find((control) => control.key === key)?.label ?? "Setting";
    toast.success(`${label} ${value ? "enabled" : "disabled"}`);
  }

  // Handlers are the API wiring points; the dialogs/tabs surface their own toasts.
  const noop = () => {};

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <UserProfilePanel
          user={user}
          wallets={wallets}
          transferCodes={transferCodes}
          onLoginAsUser={() => toast("Logging in as user…")}
          onNotify={noop}
          onManageFunds={noop}
          onSaveTransferCodes={noop}
          onWithdrawalControl={noop}
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
            <UserStatsTab summary={txnSummary} />
          </TabsContent>
          <TabsContent value="information">
            <UserInfoTab user={user} onUpdate={noop} />
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
