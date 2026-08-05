import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Self-contained rather than importing lib/auth/session.ts — that module
// pulls in next/headers' `cookies()`, which is meant for Server
// Components/Route Handlers, not Middleware (which reads cookies off
// `NextRequest` instead). Duplicating the cookie name + verify call here
// keeps Middleware's Edge runtime import graph predictable.
const SESSION_COOKIE = "cinematch_session";

// Routes that require an account — kept in sync with the `requiresAuth`
// flags in lib/navigation.ts, plus /profile which isn't nav-gated but has
// always been sign-in-only.
const PROTECTED_PREFIXES = [
  "/dashboard/profile",
  "/dashboard/favorites",
  "/dashboard/watchlist",
  "/dashboard/recommendations",
  "/dashboard/recent",
];

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  if (await hasValidSession(request)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/profile/:path*",
    "/dashboard/favorites/:path*",
    "/dashboard/watchlist/:path*",
    "/dashboard/recommendations/:path*",
    "/dashboard/recent/:path*",
  ],
};
