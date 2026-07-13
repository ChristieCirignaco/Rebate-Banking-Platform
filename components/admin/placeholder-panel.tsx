import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

// Empty-state panel used by admin screens whose feature lands in a later phase.
export function PlaceholderPanel({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground flex min-h-40 items-center justify-center p-6 text-center text-sm">
        {children}
      </CardContent>
    </Card>
  );
}
