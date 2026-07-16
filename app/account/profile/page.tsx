import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Landmark } from "lucide-react";

import { ProfileForm } from "@/components/account/profile-form";
import { UserSignOutButton } from "@/components/user-sign-out-button";
import { requireActiveUser } from "@/lib/auth-guards";
import { COUNTRIES } from "@/lib/countries";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { session } = await requireActiveUser();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      country: true,
      phone: true,
      gender: true,
      address: true,
      username: true,
      birthday: true,
      image: true,
    },
  });
  // requireActiveUser already guaranteed the session user; this only covers the row vanishing
  // between the guard and this read.
  if (!user) redirect("/login");

  const [firstName, ...rest] = (user.name ?? "").split(" ");
  const lastName = rest.join(" ");
  // Stored country is the display name; resolve back to its code so the Select can preselect.
  const countryCode = COUNTRIES.find((c) => c.name === user.country)?.code ?? "";

  return (
    <div className="bg-muted/30 min-h-svh">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
              <Landmark className="size-4" />
            </div>
            <span className="font-semibold">Rebate Bank</span>
          </div>
          <UserSignOutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your personal details and contact information.
          </p>
        </div>

        <ProfileForm
          initial={{
            firstName: firstName ?? "",
            lastName,
            email: user.email,
            emailVerified: user.emailVerified,
            countryCode,
            phone: user.phone ?? "",
            gender: (user.gender as "male" | "female" | "other" | "unspecified") ?? "unspecified",
            address: user.address ?? "",
            username: user.username ?? "",
            // yyyy-mm-dd for the date input — same slice the admin user detail uses.
            birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : "",
            image: user.image ?? "",
          }}
        />
      </main>
    </div>
  );
}
