import type { Metadata } from "next";
import { ArrowUpFromLine } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Withdrawals" };

export default function WithdrawPage() {
  return (
    <PlaceholderScreen
      title="Withdrawals"
      description="Withdraw your balance to a bank or payout method."
      icon={ArrowUpFromLine}
    />
  );
}
