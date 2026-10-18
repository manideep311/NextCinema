import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
  readSessionCookie,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
  type VerifiedSession,
} from "@/lib/auth/token";
import { jsonError, PRIVATE_NO_STORE } from "@/lib/http";

// Session helpers for Route Handlers. Kept apart from lib/auth/session.ts
// (Server Component helpers that use next/headers and next/navigation) so
// API routes depend only on the request they're given — which also lets
// tests call route handlers directly.

/** Route Handler variant — reads the cookie straight off the request. */
export function getRequestSession(request: NextRequest): Promise<VerifiedSession | null> {
  return verifySessionToken(readSessionCookie(request.cookies).token);
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

/** Expires the session cookie — and the pre-rename one, so sign-out leaves neither behind. */
export function clearSessionCookie(response: NextResponse): void {
  for (const name of [SESSION_COOKIE, LEGACY_SESSION_COOKIE]) {
    response.cookies.set(name, "", { ...sessionCookieOptions(0), expires: new Date(0) });
  }
}
