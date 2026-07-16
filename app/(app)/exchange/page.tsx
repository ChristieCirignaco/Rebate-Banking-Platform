import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Exchange Money" };

export default function ExchangePage() {
  return (
    <PlaceholderScreen
      title="Exchange Money"
      description="Convert between your currency wallets."
      icon={ArrowLeftRight}
    />
  );
}
