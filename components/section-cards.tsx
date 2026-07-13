import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Admin overview metrics. Values are placeholders until the ledger is wired (Phase 3).
const CARDS = [
  { label: "Pending claims", value: "—", hint: "Awaiting review" },
  { label: "Pending withdrawals", value: "—", hint: "Awaiting fulfillment" },
  { label: "KYC in review", value: "—", hint: "Identity checks queued" },
  { label: "Total wallet balance", value: "—", hint: "Across all users" },
];

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {CARDS.map((card) => (
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
