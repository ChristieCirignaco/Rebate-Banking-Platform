import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <PlaceholderScreen
      title="Support"
      description="Open a ticket and chat with our support team."
      icon={LifeBuoy}
    />
  );
}
