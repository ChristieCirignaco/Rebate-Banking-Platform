import type { Metadata } from "next";
import { ArrowDownToLine } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Deposit Money" };

export default function DepositPage() {
  return (
    <PlaceholderScreen
      title="Deposit Money"
      description="Fund your wallet via bank transfer or a payment provider."
      icon={ArrowDownToLine}
    />
  );
}
