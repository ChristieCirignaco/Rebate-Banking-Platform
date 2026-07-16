import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Referrals" };

export default function ReferralsPage() {
  return (
    <PlaceholderScreen
      title="Referrals"
      description="Invite friends and track your referrals."
      icon={Users}
    />
  );
}
