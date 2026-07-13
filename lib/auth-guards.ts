import { headers } from "next/headers";

import { auth } from "@/lib/auth";

// Server-side session + authorization helpers. Server actions and route handlers are
// separate entry points, so they must re-check auth here (the layout is not enough).

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

// Returns the admin session, or null if the caller is not a signed-in admin.
export async function getAdminSession(): Promise<Session | null> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function hasPermission(
  permissions: Record<string, string[]>,
): Promise<boolean> {
  try {
    const result = await auth.api.userHasPermission({
      headers: await headers(),
      body: { permissions },
    });
    return result.success === true;
  } catch {
    return false;
  }
}
