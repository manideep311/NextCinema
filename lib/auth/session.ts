import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
  type VerifiedSession,
} from "@/lib/auth/token";
import { jsonError, PRIVATE_NO_STORE } from "@/lib/http";

export { SESSION_COOKIE };
export type { SessionPayload, VerifiedSession };

/**
 * The verified session for the current Server Component render, or null.
 * Wrapped in React `cache` so the root layout, dashboard layout, page, and
 * any nested server components share one cookie read + signature check per
 * request instead of repeating it at every call site.
 */
export const getSession = cache(async (): Promise<VerifiedSession | null> => {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
});

/** Server Component/page gate: redirects to login (returning here afterwards) when signed out. */
export async function requirePageSession(returnTo: string): Promise<VerifiedSession> {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  return session;
}

/** Route Handler variant — reads the cookie straight off the request. */
export function getRequestSession(request: NextRequest): Promise<VerifiedSession | null> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * The first step of every user-scoped API route:
 *   request → verify session → derive identity → (caller authorizes + acts)
 * The user id used for every subsequent query comes from here — never from
 * a body, query string, or path parameter.
 */
export async function requireRequestSession(
  request: NextRequest
): Promise<{ session: VerifiedSession; response?: undefined } | { session?: undefined; response: NextResponse }> {
  const session = await getRequestSession(request);
  if (!session) return { response: jsonError(401, "Sign in to continue.", PRIVATE_NO_STORE) };
  return { session };
}

export async function attachSessionCookie(response: NextResponse, payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), expires: new Date(0) });
}
