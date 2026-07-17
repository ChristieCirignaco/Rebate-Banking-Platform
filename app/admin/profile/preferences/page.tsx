import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PreferencesForm } from "@/components/admin/profile/preferences-form";
import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Preferences" };

export default async function AdminProfilePreferencesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [user, currencies] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true, locale: true, currency: true },
    }),
    prisma.currency.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);
  if (!user) redirect("/admin/login");

  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <PreferencesForm
      initial={{
        timezone: user.timezone ?? "UTC",
        locale: user.locale ?? "",
        currency: user.currency ?? "USD",
      }}
      timezones={timezones}
      currencies={currencies}
    />
  );
}
