import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { ReferralsAdminView } from "@/components/admin/referrals/referrals-admin-view";
import { getAdminReferralEarnings } from "@/lib/admin/referrals";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Referrals" };

export default async function AdminReferralsPage() {
  const [settings, earnings] = await Promise.all([
    getSettings("referrals"),
    getAdminReferralEarnings(),
  ]);

  return (
    <AdminSection
      title="Referrals"
      description="Configure referral rewards and review earnings. Approve to credit the referrer's wallet."
    >
      <ReferralsAdminView settings={settings} earnings={earnings} />
    </AdminSection>
  );
}
