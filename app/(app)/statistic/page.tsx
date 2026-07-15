import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata: Metadata = { title: "Statistic" };

export default function StatisticPage() {
  return (
    <PlaceholderScreen
      title="Statistic"
      description="Charts of your rebates, deposits, and spending over time will live here."
      icon={ChartColumn}
    />
  );
}
