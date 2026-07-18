import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminProfileForm } from "@/components/admin/profile/admin-profile-form";
import { getAdminSession } from "@/lib/auth-guards";
import { COUNTRIES } from "@/lib/countries";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Profile" };

export default async function AdminProfilePage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

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
  if (!user) redirect("/admin/login");

  const [firstName, ...rest] = (user.name ?? "").split(" ");
  const lastName = rest.join(" ");
  // Stored country is the display name; resolve back to its code so the Select can preselect.
  const countryCode = COUNTRIES.find((c) => c.name === user.country)?.code ?? "";

  return (
    <AdminProfileForm
      initial={{
        firstName: firstName ?? "",
        lastName,
        email: user.email,
        emailVerified: user.emailVerified,
        countryCode,
        phone: user.phone ?? "",
        gender:
          (user.gender as "male" | "female" | "other" | "unspecified") ?? "unspecified",
        address: user.address ?? "",
        username: user.username ?? "",
        birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : "",
        image: user.image ?? "",
      }}
    />
  );
}
