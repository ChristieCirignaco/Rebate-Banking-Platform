import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <PlaceholderScreen
      title="Wallet"
      description="Manage your currency wallets, deposits, and withdrawals here — coming in a later update."
      icon={Wallet}
    />
  );
}
