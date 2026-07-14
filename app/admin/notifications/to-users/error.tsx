"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 lg:px-6">
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="bg-rose-500/10 flex size-14 items-center justify-center rounded-full">
          <TriangleAlert className="size-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <p className="font-medium">Could not load the composer</p>
          <p className="text-muted-foreground text-sm">
            Something went wrong while preparing the broadcast composer.
          </p>
        </div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
