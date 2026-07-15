import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { RegisterProductsForm } from "@/components/auth/register-products-form";
import { REGISTRATION_COOKIE, verifyRegistrationToken } from "@/lib/registration-token";
import { getSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Add your products" };

// Step 2 of registration (optional): the just-registered, session-less user can add product
// submissions or skip. Reachable only with a valid continuation cookie from step 1.
export default async function RegisterProductsPage() {
  const store = await cookies();
  const userId = verifyRegistrationToken(store.get(REGISTRATION_COOKIE)?.value);
  if (!userId) redirect("/register");

  const branding = await getSettings("branding");
  return <RegisterProductsForm logoUrl={branding.logoLight} />;
}
