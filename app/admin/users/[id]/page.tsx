import type { Metadata } from "next";

import { UserDetailView } from "@/components/admin/users/detail/user-detail-view";
import {
  getActivity,
  getControls,
  getReferrals,
  getTransactions,
  getTransferCodes,
  getTxnSummary,
  getUserDetail,
  getWallets,
} from "@/components/admin/users/detail/mock-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Manage ${getUserDetail(id).name}` };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = getUserDetail(id);

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Manage Of User {user.name}
      </h1>
      <UserDetailView
        user={user}
        wallets={getWallets()}
        controls={getControls()}
        txnSummary={getTxnSummary(30)}
        transactions={getTransactions()}
        referrals={getReferrals()}
        activity={getActivity()}
        transferCodes={getTransferCodes()}
      />
    </div>
  );
}
