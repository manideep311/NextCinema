import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  shouldRenewSession,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/token";
import { isProtectedPath } from "@/lib/auth/protected-routes";
import { INTRO_COOKIE, INTRO_HEADER } from "@/lib/intro";

/**
 * Runs before page requests (Next.js 16's replacement for middleware.ts).
 *
 * 1. Optimistic redirect: signed-out visitors hitting an account-only page
 *    go to /login (with a sanitized-on-arrival `redirect` back). This is a
 *    UX shortcut only — each protected page and API route still verifies the
 *    session itself, so authorization never depends on this file.
 * 2. Sliding session: a valid token older than a day is re-issued, so active
 *    users stay signed in while idle sessions still expire after 7 days.
 * 3. Stale cookies (expired/tampered/foreign tokens) are cleared.
 * 4. Marks the browsing session as having seen the opening intro, so the
 *    root layout renders it only on the session's first page load.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const { pathname, search } = request.nextUrl;

  if (!session && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    if (token) redirect.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), expires: new Date(0) });
    return redirect;
  }

  // First page load of this browsing session → tell the layout to render the
  // opening intro (via a header only this proxy can set) and mark the session
  // with a session cookie (no expiry) so no later request plays it again.
  const firstVisit = !request.cookies.has(INTRO_COOKIE);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(INTRO_HEADER);
  if (firstVisit) requestHeaders.set(INTRO_HEADER, "1");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (firstVisit) {
    response.cookies.set(INTRO_COOKIE, "1", { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  }

  if (token && !session) {
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), expires: new Date(0) });
  } else if (session && shouldRenewSession(session)) {
    const renewed = await signSessionToken({
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    });
    response.cookies.set(SESSION_COOKIE, renewed, sessionCookieOptions());
  }

  return response;
}

export const config = {
  // Pages only — API routes verify sessions themselves, and static assets never need it.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)"],
};
