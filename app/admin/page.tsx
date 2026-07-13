import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

// Static placeholders for now; live figures arrive once the ledger is wired (Phase 3).
const STATS = [
  { label: "Pending claims", value: "—" },
  { label: "Pending withdrawals", value: "—" },
  { label: "KYC in review", value: "—" },
  { label: "Total wallet balance", value: "—" },
];

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Operational overview. Live figures arrive once claims and the ledger are wired."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold tabular-nums">
                {stat.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
