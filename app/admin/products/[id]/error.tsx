"use client";

import { useEffect } from "react";
import Link from "next/link";
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
          <p className="font-medium">Could not load this submission</p>
          <p className="text-muted-foreground text-sm">
            Something went wrong while fetching the details.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/admin/products">Back to List</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
