import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserDetailView } from "@/components/admin/users/detail/user-detail-view";
import { getSuperAdminSession } from "@/lib/auth-guards";
import { getUserDetailData } from "@/lib/admin/user-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getUserDetailData(id);
  return { title: data ? `Manage ${data.user.name}` : "User" };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, canDelete] = await Promise.all([
    getUserDetailData(id),
    // Deleting a user is super_admin-only (the server action re-checks); this only decides
    // whether the Security tab's Delete-account card is shown.
    getSuperAdminSession().then(Boolean),
  ]);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Manage Of User {data.user.name}</h1>
      <UserDetailView
        user={data.user}
        canDelete={canDelete}
        wallets={data.wallets}
        assignableCurrencies={data.assignableCurrencies}
        walletSlotsLeft={data.walletSlotsLeft}
        controls={data.controls}
        statValues={data.statValues}
        statCurrency={data.statCurrency}
        txnSummary={data.txnSummary}
        transactions={data.transactions}
        referrals={data.referrals}
        activity={data.activity}
        transferCodes={data.transferCodes}
      />
    </div>
  );
}
