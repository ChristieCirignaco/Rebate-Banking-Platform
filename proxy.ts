import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 uses proxy.ts (middleware.ts is silently ignored). These are optimistic
// cookie-presence checks for fast redirects; the real enforcement (valid session + the
// right role/status) lives in the /admin layout and the /dashboard page server components.
const ADMIN_LOGIN = "/admin/login";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // Tag the request path so the admin layout can tell the (public) admin login apart from a
  // protected admin page without a pathname hook.
  function pass() {
    const headers = new Headers(request.headers);
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
  }

  // The admin login is the one public /admin route (it's the way in).
  if (pathname === ADMIN_LOGIN) return pass();

  if (pathname.startsWith("/admin")) {
    if (!sessionCookie) {
      const url = new URL(ADMIN_LOGIN, request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return pass();
  }

  // The user area redirects to the USER login, never the admin one.
  if (pathname.startsWith("/dashboard")) {
    if (!sessionCookie) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
