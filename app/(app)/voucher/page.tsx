import type { Metadata } from "next";
import { Ticket } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Voucher" };

export default function VoucherPage() {
  return (
    <PlaceholderScreen
      title="Voucher"
      description="Redeem and manage vouchers."
      icon={Ticket}
    />
  );
}
