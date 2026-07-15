import type { Metadata } from "next";

import { GeneralForm } from "@/components/admin/settings/general-form";
import { prisma } from "@/lib/db";
import { getClientSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "General Settings" };

export default async function GeneralSettingsPage() {
  const [{ values }, currencies] = await Promise.all([
    getClientSettings("general"),
    prisma.currency.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  // Intl gives the full IANA zone list; computed here so it isn't bundled to the client.
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <GeneralForm
      initial={values}
      timezones={timezones}
      currencies={currencies.map((c) => ({ code: c.code, name: c.name }))}
    />
  );
}
