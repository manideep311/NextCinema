import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { SignJWT, UnsecuredJWT } from "jose";
import {
  movieIdParamSchema,
  movieRefBodySchema,
  pageParamSchema,
  searchQuerySchema,
  journeyIdSchema,
  watchedBodySchema,
} from "@/lib/validation";
import { loginSchema, signupSchema } from "@/lib/auth/schemas";
import { sanitizeRedirect } from "@/lib/auth/redirect";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { isProtectedPath } from "@/lib/auth/protected-routes";
import { resolveWatchRegion } from "@/lib/region";
import { hourInTimeZone } from "@/lib/time-of-day";

import { signSessionToken, verifySessionToken, sessionCookieOptions, shouldRenewSession, SESSION_TTL_SECONDS } from "@/lib/auth/token";
import { hashPassword, verifyPassword, needsRehash } from "@/lib/auth/password";

// Read lazily by lib/auth/token.ts at sign/verify time, so setting it here (after imports) is enough.
process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";

const USER = { userId: "65f0c0ffee0000000000abcd", email: "a@example.com", name: "Alice", role: "user" as const };
const KEY = new TextEncoder().encode(process.env.AUTH_SECRET);

// --- Session tokens ---------------------------------------------------------------

test("valid token round-trips to the same identity", async () => {
  const session = await verifySessionToken(await signSessionToken(USER));
  assert.ok(session);
  assert.equal(session.userId, USER.userId);
  assert.equal(session.expiresAt - session.issuedAt, SESSION_TTL_SECONDS);
});

test("expired tokens are rejected", async () => {
  const token = await signSessionToken(USER, Date.now() - (SESSION_TTL_SECONDS + 60) * 1000);
  assert.equal(await verifySessionToken(token), null);
});

test("malformed, tampered, and oversized tokens are rejected without throwing", async () => {
  const token = await signSessionToken(USER);
  const [header, payload, signature] = token.split(".");
  for (const bad of ["", "garbage", "a.b.c", `${header}.${payload}.${signature.slice(0, -2)}xx`, `${header}.${payload}`, "x".repeat(5000)]) {
    assert.equal(await verifySessionToken(bad), null, bad.slice(0, 20));
  }
  // Payload swapped for another user's id, original signature kept.
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), sub: "65f0c0ffee0000000000ffff" })).toString("base64url");
  assert.equal(await verifySessionToken(`${header}.${forged}.${signature}`), null);
});

test("alg:none, wrong secret, wrong audience, and missing claims are rejected", async () => {
  const unsigned = new UnsecuredJWT({ email: USER.email, name: USER.name, role: "admin" }).setSubject(USER.userId).setIssuer("nextcinema").setAudience("nextcinema:web").setIssuedAt().setExpirationTime("1h").encode();
  assert.equal(await verifySessionToken(unsigned), null);

  const wrongKey = await new SignJWT({ email: USER.email, name: USER.name, role: "user" })
    .setProtectedHeader({ alg: "HS256" }).setSubject(USER.userId).setIssuer("nextcinema").setAudience("nextcinema:web").setIssuedAt().setExpirationTime("1h")
    .sign(new TextEncoder().encode("another-secret-another-secret-another-secret"));
  assert.equal(await verifySessionToken(wrongKey), null);

  const wrongAudience = await new SignJWT({ email: USER.email, name: USER.name, role: "user" })
    .setProtectedHeader({ alg: "HS256" }).setSubject(USER.userId).setIssuer("nextcinema").setAudience("someone-else").setIssuedAt().setExpirationTime("1h").sign(KEY);
  assert.equal(await verifySessionToken(wrongAudience), null);

  // Old-format token (userId claim, no sub/iss/aud) — treated as signed out, not trusted.
  const legacy = await new SignJWT({ ...USER }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(KEY);
  assert.equal(await verifySessionToken(legacy), null);

  // Invalid role / non-ObjectId subject.
  const badRole = await new SignJWT({ email: USER.email, name: USER.name, role: "superuser" })
    .setProtectedHeader({ alg: "HS256" }).setSubject(USER.userId).setIssuer("nextcinema").setAudience("nextcinema:web").setIssuedAt().setExpirationTime("1h").sign(KEY);
  assert.equal(await verifySessionToken(badRole), null);
});

test("cookie flags: httpOnly, SameSite=Lax, path=/, expiry = token lifetime", () => {
  const options = sessionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, SESSION_TTL_SECONDS);
  assert.equal(options.secure, process.env.NODE_ENV === "production");
});

test("sessions renew only once they're older than a day", async () => {
  const fresh = (await verifySessionToken(await signSessionToken(USER)))!;
  assert.equal(shouldRenewSession(fresh), false);
  const oldToken = await signSessionToken(USER, Date.now() - 2 * 86_400_000);
  const old = (await verifySessionToken(oldToken))!;
  assert.equal(shouldRenewSession(old), true);
});

// --- Passwords --------------------------------------------------------------------

test("scrypt hashes verify, reject wrong passwords, and use unique salts", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.notEqual(a, b);
  assert.match(a, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyPassword("correct horse battery", a), true);
  assert.equal(await verifyPassword("correct horse batterY", a), false);
  assert.equal(needsRehash(a), false);
});

test("legacy salt:key hashes still verify and are flagged for upgrade", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const legacy = `${salt}:${scryptSync("old-password", salt, 64).toString("hex")}`;
  assert.equal(await verifyPassword("old-password", legacy), true);
  assert.equal(await verifyPassword("wrong", legacy), false);
  assert.equal(needsRehash(legacy), true);
});

test("malformed stored hashes fail closed", async () => {
  for (const stored of ["", "nocolon", "zz:zz", "scrypt$99999999$8$1$AA$BB", "scrypt$32768$8$1$c2FsdA==$short"]) {
    assert.equal(await verifyPassword("anything", stored), false, stored);
  }
});

// --- Input validation ----------------------------------------------------------------

test("movie ids, pages, and search queries reject unreasonable input", () => {
  for (const good of ["1", "550", "2147483647"]) assert.ok(movieIdParamSchema.safeParse(good).success, good);
  for (const bad of ["0", "-1", "1e3", "01", "abc", "2147483648", "12.5", " 5"]) assert.ok(!movieIdParamSchema.safeParse(bad).success, bad);
  for (const bad of ["0", "501", "-2", "9999", "a"]) assert.ok(!pageParamSchema.safeParse(bad).success, bad);
  assert.ok(!searchQuerySchema.safeParse("x").success);
  assert.ok(!searchQuerySchema.safeParse("x".repeat(101)).success);
  assert.ok(!journeyIdSchema.safeParse("../etc/passwd").success);
  assert.ok(!journeyIdSchema.safeParse("Harry Potter").success);
});

test("write bodies are strict: a smuggled userId or extra field is rejected", () => {
  assert.ok(movieRefBodySchema.safeParse({ movieId: 550 }).success);
  assert.ok(!movieRefBodySchema.safeParse({ movieId: 550, userId: "65f0c0ffee0000000000ffff" }).success);
  assert.ok(!movieRefBodySchema.safeParse({ movieId: "550" }).success);
  assert.ok(!movieRefBodySchema.safeParse({ movieId: 550, title: "<script>" }).success);
  assert.ok(!watchedBodySchema.safeParse({ movieId: 1, journeyId: "x", role: "admin" }).success);
  assert.ok(!signupSchema.safeParse({ name: "A", email: "a@b.co", password: "12345678", role: "admin" }).success);
  assert.ok(!signupSchema.safeParse({ name: "A", email: "a@b.co", password: "short" }).success);
  assert.ok(!signupSchema.safeParse({ name: "A", email: "a@b.co", password: "x".repeat(129) }).success);
  assert.equal(loginSchema.parse({ email: "  Mixed@Case.COM ", password: "p" }).email, "mixed@case.com");
});

test("post-login redirects stay on this site", () => {
  assert.equal(sanitizeRedirect("/dashboard/favorites"), "/dashboard/favorites");
  assert.equal(sanitizeRedirect("/dashboard/journeys/harry-potter?order=release"), "/dashboard/journeys/harry-potter?order=release");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "dashboard", "/login", null, ""]) {
    assert.equal(sanitizeRedirect(bad as string | null), "/dashboard", String(bad));
  }
});

test("protected-route matching is exact per segment", () => {
  assert.ok(isProtectedPath("/dashboard/favorites"));
  assert.ok(isProtectedPath("/dashboard/profile/settings"));
  assert.ok(!isProtectedPath("/dashboard/favoritesX"));
  assert.ok(!isProtectedPath("/dashboard/journeys"));
});

// --- Rate limiting --------------------------------------------------------------------

test("fixed-window limiter blocks over the limit and resets after the window", () => {
  let now = 0;
  const limiter = new FixedWindowRateLimiter(() => now);
  const policy = { limit: 3, windowMs: 1000 };
  assert.deepEqual([1, 2, 3, 4].map(() => limiter.check("k", policy).allowed), [true, true, true, false]);
  assert.equal(limiter.check("other", policy).allowed, true, "keys are independent");
  now = 1001;
  assert.equal(limiter.check("k", policy).allowed, true);
});

// --- Misc boundaries --------------------------------------------------------------------

test("watch region comes from trusted geo headers, else the configured default", () => {
  assert.equal(resolveWatchRegion(new Headers({ "x-vercel-ip-country": "us" })), "US");
  assert.equal(resolveWatchRegion(new Headers({ "cf-ipcountry": "XX" })), "IN");
  assert.equal(resolveWatchRegion(new Headers()), "IN");
  assert.equal(resolveWatchRegion(new Headers({ "x-vercel-ip-country": "<script>" })), "IN");
});

test("time-zone greeting input is validated", () => {
  assert.equal(typeof hourInTimeZone("Asia/Kolkata"), "number");
  assert.equal(hourInTimeZone("Not/AZone"), null);
  assert.equal(hourInTimeZone("'; drop"), null);
});
