import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ProfileForm } from "@/components/account/profile-form";
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
  const countryCode =
    COUNTRIES.find((c) => c.name === user.country)?.code ?? "";

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/settings"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Profile
            </h1>
            <p className="truncate text-sm text-slate-500">
              Your personal details and contact information.
            </p>
          </div>
        </div>

        <ProfileForm
          initial={{
            firstName: firstName ?? "",
            lastName,
            email: user.email,
            emailVerified: user.emailVerified,
            countryCode,
            phone: user.phone ?? "",
            gender:
              (user.gender as "male" | "female" | "other" | "unspecified") ??
              "unspecified",
            address: user.address ?? "",
            username: user.username ?? "",
            // yyyy-mm-dd for the date input — same slice the admin user detail uses.
            birthday: user.birthday
              ? user.birthday.toISOString().slice(0, 10)
              : "",
            image: user.image ?? "",
          }}
        />
      </div>
    </div>
  );
}
