import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 uses proxy.ts (middleware.ts is silently ignored). This is an optimistic
// cookie-presence check for a fast redirect; the real enforcement (valid session +
// admin role) lives in the /admin layout server component (design spec §8).
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
