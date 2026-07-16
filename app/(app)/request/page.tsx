import type { Metadata } from "next";
import { HandCoins } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Request Money" };

export default function RequestPage() {
  return (
    <PlaceholderScreen
      title="Request Money"
      description="Request money from another user."
      icon={HandCoins}
    />
  );
}
