import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/admin-section";
import { GatewayTable } from "@/components/admin/payment-gateways/gateway-table";
import { Card } from "@/components/ui/card";
import { getGateways } from "@/lib/admin/payment-gateways";

export const metadata: Metadata = { title: "Payment Gateways" };

export default async function AdminPaymentGatewaysPage() {
  const gateways = await getGateways();

  return (
    <AdminSection
      title="Payment Gateways"
      description="Configure automatic payment gateways and their credentials."
    >
      <Card className="overflow-hidden py-0">
        <GatewayTable gateways={gateways} />
      </Card>
    </AdminSection>
  );
}
