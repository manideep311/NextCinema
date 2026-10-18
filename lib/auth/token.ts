import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

// Pure JWT session-token logic — no `next/headers`, so it runs anywhere:
// Server Components/Route Handlers (via lib/auth/session.ts), proxy.ts,
// and plain-Node unit tests. The token is only ever stored in an httpOnly
// cookie; it is never exposed to browser JavaScript or logged.

export const SESSION_COOKIE = "nextcinema_session";

/**
 * The cookie name from before the CineMatch → NextCinema rename. Still
 * *read* for one release so existing sign-ins survive the deploy (proxy.ts
 * moves a valid one over to SESSION_COOKIE); it is never written. Remove
 * after the next release.
 */
export const LEGACY_SESSION_COOKIE = "cinematch_session";

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

/** The session token from a cookie jar — the current cookie wins; the legacy one is the fallback. */
export function readSessionCookie(cookies: CookieReader): { token: string | undefined; legacy: boolean } {
  const current = cookies.get(SESSION_COOKIE)?.value;
  if (current) return { token: current, legacy: false };
  const legacy = cookies.get(LEGACY_SESSION_COOKIE)?.value;
  return { token: legacy || undefined, legacy: Boolean(legacy) };
}

/** Absolute lifetime of a session token. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Tokens older than this are transparently re-issued by proxy.ts (sliding session). */
export const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24;

const ISSUER = "nextcinema";
const AUDIENCE = "nextcinema:web";
const MIN_SECRET_LENGTH = 32;
/** Real tokens are a few hundred bytes — anything huge is rejected before parsing. */
const MAX_TOKEN_LENGTH = 4096;

/**
 * The only role that exists. "premium" and "admin" were declared but
 * nothing granted or checked them, so they're gone; a token claiming
 * either now fails validation and is treated as signed out.
 */
export const USER_ROLES = ["user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  /**
   * The user's `tokenVersion` when this token was issued. Signing out
   * increments the stored version, so every token issued before it stops
   * being renewed (see proxy.ts and services/auth.ts `revokeSessions`).
   */
  tokenVersion: number;
}

export interface VerifiedSession extends SessionPayload {
  /** Unix seconds. */
  issuedAt: number;
  /** Unix seconds. */
  expiresAt: number;
}

// Signature/expiry are checked by `jwtVerify`; this checks the *shape* of
// what was signed, so a validly-signed but unexpected payload (older token
// format, missing claim) is treated as signed out instead of trusted.
const claimsSchema = z.object({
  sub: z.string().regex(/^[a-f0-9]{24}$/),
  email: z.string().email().max(254),
  name: z.string().min(1).max(80),
  role: z.enum(USER_ROLES),
  // Absent on tokens issued before versioning existed; those count as version 0.
  tv: z.number().int().min(0).optional(),
  iat: z.number().int(),
  exp: z.number().int(),
});

let cachedKey: { secret: string; key: Uint8Array } | null = null;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters (see README).`
    );
  }
  if (cachedKey?.secret !== secret) {
    cachedKey = { secret, key: new TextEncoder().encode(secret) };
  }
  return cachedKey.key;
}

export async function signSessionToken(payload: SessionPayload, nowMs: number = Date.now()): Promise<string> {
  const now = Math.floor(nowMs / 1000);
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role, tv: payload.tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSecretKey());
}

/**
 * Verifies signature (HS256 only — `alg: none` and algorithm-confusion
 * tokens are rejected), issuer, audience, expiry, and payload shape.
 * Returns null — never throws — for any missing, malformed, tampered,
 * expired, or foreign token.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  nowMs?: number
): Promise<VerifiedSession | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ["sub", "iat", "exp"],
      ...(nowMs !== undefined ? { currentDate: new Date(nowMs) } : {}),
    });

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) return null;

    const { sub, email, name, role, tv, iat, exp } = claims.data;
    return { userId: sub, email, name, role, tokenVersion: tv ?? 0, issuedAt: iat, expiresAt: exp };
  } catch {
    return null;
  }
}

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

/**
 * httpOnly (unreadable from JS), Secure in production, SameSite=Lax (not
 * sent on cross-site POST/fetch — the primary CSRF defense), scoped to the
 * whole site, and expiring with the token itself.
 */
export function sessionCookieOptions(maxAge: number = SESSION_TTL_SECONDS): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

/** True when a still-valid token is old enough to be re-issued. */
export function shouldRenewSession(session: VerifiedSession, nowMs: number = Date.now()): boolean {
  return Math.floor(nowMs / 1000) - session.issuedAt > SESSION_RENEW_AFTER_SECONDS;
}
