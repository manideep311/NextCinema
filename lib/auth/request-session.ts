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
import { checkSessionVersion } from "@/services/auth";

// Session helpers for Route Handlers. Kept apart from lib/auth/session.ts
// (Server Component helpers that use next/headers and next/navigation) so
// API routes depend only on the request they're given — which also lets
// tests call route handlers directly.

/**
 * Who is signed in, for routes that only *report* it (/api/auth/session,
 * logout): a valid, unrevoked token, or null. If the revocation lookup
 * fails the session is kept, so a database blip never signs a user out of
 * the client — routes that touch user data use requireRequestSession,
 * which fails closed instead.
 */
export async function getRequestSession(request: NextRequest): Promise<VerifiedSession | null> {
  const session = await verifySessionToken(readSessionCookie(request.cookies).token);
  if (!session) return null;
  return (await checkSessionVersion(session)) === "revoked" ? null : session;
}

/**
 * The first step of every user-scoped API route:
 *   request → verify token → check it isn't revoked → derive identity → (caller authorizes + acts)
 * The user id used for every subsequent query comes from here — never from
 * a body, query string, or path parameter. A token issued before the
 * user's last sign-out is rejected on every call, not just at renewal.
 * If the revocation lookup fails this fails closed (503): the route was
 * about to read user data from the same database anyway.
 */
export async function requireRequestSession(
  request: NextRequest
): Promise<{ session: VerifiedSession; response?: undefined } | { session?: undefined; response: NextResponse }> {
  const session = await verifySessionToken(readSessionCookie(request.cookies).token);
  if (!session) return { response: jsonError(401, "Sign in to continue.", PRIVATE_NO_STORE) };

  const status = await checkSessionVersion(session);
  if (status === "revoked") return { response: jsonError(401, "Sign in to continue.", PRIVATE_NO_STORE) };
  if (status === "unknown") {
    return { response: jsonError(503, "Couldn't verify your session right now — please try again.", PRIVATE_NO_STORE) };
  }
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
