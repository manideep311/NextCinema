import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionCookie, verifySessionToken, type SessionPayload, type VerifiedSession } from "@/lib/auth/token";

export { SESSION_COOKIE };
export type { SessionPayload, VerifiedSession };

// Server Component helpers. Route Handlers use lib/auth/request-session.ts.

/**
 * The verified session for the current Server Component render, or null.
 * Wrapped in React `cache` so the root layout, dashboard layout, page, and
 * any nested server components share one cookie read + signature check per
 * request instead of repeating it at every call site.
 */
export const getSession = cache(async (): Promise<VerifiedSession | null> => {
  const cookieStore = await cookies();
  return verifySessionToken(readSessionCookie(cookieStore).token);
});

/** Server Component/page gate: redirects to login (returning here afterwards) when signed out. */
export async function requirePageSession(returnTo: string): Promise<VerifiedSession> {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  return session;
}
