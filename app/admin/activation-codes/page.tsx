import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ActivationCodesView } from "@/components/admin/activation-codes/activation-codes-view";
import { StatCards } from "@/components/admin/overview/stat-card";
import { Button } from "@/components/ui/button";
import { getActivationCodeStatWidgets, getActivationCodes } from "@/lib/admin/activation-codes";

export const metadata: Metadata = { title: "Activation Codes" };

// StatCards applies its own px-4 lg:px-6, so the header/body here stay siblings rather
// than nesting inside a shared padded wrapper (mirrors app/admin/page.tsx's layout).
export default async function ActivationCodesPage() {
  const [statWidgets, list] = await Promise.all([
    getActivationCodeStatWidgets(),
    getActivationCodes(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activation Codes</h1>
          <p className="text-muted-foreground text-sm">
            Track, filter, and manage invitation codes users can enter at registration.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">
            <ArrowLeft className="size-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      <StatCards widgets={statWidgets} />

      <div className="px-4 lg:px-6">
        <ActivationCodesView initial={list} />
      </div>
    </div>
  );
}
