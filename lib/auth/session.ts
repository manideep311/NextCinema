import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionCookie, verifySessionToken, type SessionPayload, type VerifiedSession } from "@/lib/auth/token";
import { checkSessionVersion } from "@/services/auth";

export { SESSION_COOKIE };
export type { SessionPayload, VerifiedSession };

// Server Component helpers. Route Handlers use lib/auth/request-session.ts.

/**
 * The verified, unrevoked session for the current Server Component render,
 * or null. A token issued before the user's last sign-out (its
 * `tokenVersion` is behind) counts as signed out, so a copied token can't
 * render account pages. Wrapped in React `cache` so the root layout,
 * dashboard layout, page, and any nested server components share one
 * cookie read, signature check and version lookup per request.
 *
 * If the version lookup itself fails the session is kept, matching
 * getRequestSession: a database blip shouldn't bounce every signed-in user
 * to /login, and pages that read user data fail on their own in that case.
 */
export const getSession = cache(async (): Promise<VerifiedSession | null> => {
  const cookieStore = await cookies();
  const session = await verifySessionToken(readSessionCookie(cookieStore).token);
  if (!session) return null;
  return (await checkSessionVersion(session)) === "revoked" ? null : session;
});

/** Server Component/page gate: redirects to login (returning here afterwards) when signed out. */
export async function requirePageSession(returnTo: string): Promise<VerifiedSession> {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  return session;
}
