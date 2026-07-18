import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/admin/profile/change-password-form";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Security" };

export default async function AdminProfileSecurityPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordForm />
      <TwoFactorSetup initialEnabled={dbUser?.twoFactorEnabled ?? false} />
    </div>
  );
}
