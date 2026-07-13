import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/admin/metrics";

// Real overview metrics. As the claims/withdrawals/KYC/wallet subsystems land,
// their cards are added here (design spec §16).
export function SectionCards({ metrics }: { metrics: DashboardMetrics }) {
  const cards = [
    { label: "Total users", value: metrics.totalUsers, hint: "All registered accounts" },
    { label: "Admins", value: metrics.adminCount, hint: "Users with the admin role" },
    { label: "Verified users", value: metrics.verifiedUsers, hint: "Email-verified accounts" },
    {
      label: "Active feature flags",
      value: `${metrics.activeFlags}/${metrics.totalFlags}`,
      hint: "Enabled of total",
    },
  ];

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
      {cards.map((card) => (
        <Card key={card.label} className="@container/card">
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <span className="text-muted-foreground text-sm">{card.hint}</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
