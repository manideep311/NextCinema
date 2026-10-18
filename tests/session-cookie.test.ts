import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { LEGACY_SESSION_COOKIE, SESSION_COOKIE, readSessionCookie, signSessionToken, verifySessionToken } from "@/lib/auth/token";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";

const USER = { userId: "65f0c0ffee0000000000abcd", email: "a@example.com", name: "Alice", role: "user" as const };

function jar(values: Record<string, string>) {
  return { get: (name: string) => (name in values ? { value: values[name] } : undefined) };
}

test("the session cookie is named nextcinema_session; cinematch_session is the legacy name", () => {
  assert.equal(SESSION_COOKIE, "nextcinema_session");
  assert.equal(LEGACY_SESSION_COOKIE, "cinematch_session");
});

test("readSessionCookie prefers the current cookie and falls back to the legacy one", () => {
  assert.deepEqual(readSessionCookie(jar({ [SESSION_COOKIE]: "new", [LEGACY_SESSION_COOKIE]: "old" })), { token: "new", legacy: false });
  assert.deepEqual(readSessionCookie(jar({ [LEGACY_SESSION_COOKIE]: "old" })), { token: "old", legacy: true });
  assert.deepEqual(readSessionCookie(jar({})), { token: undefined, legacy: false });
});

function pageRequest(path: string, cookies: Record<string, string>) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost${path}`, { headers: { cookie } });
}

test("proxy moves a valid legacy session cookie to the new name and expires the old one", async () => {
  const token = await signSessionToken(USER);
  const response = await proxy(pageRequest("/dashboard/favorites", { [LEGACY_SESSION_COOKIE]: token, nc_intro_seen: "1" }));

  assert.notEqual(response.status, 307, "a legacy session must still count as signed in");
  const migrated = response.cookies.get(SESSION_COOKIE);
  assert.ok(migrated?.value, "new cookie is set");
  assert.equal((await verifySessionToken(migrated.value))?.userId, USER.userId);
  const expired = response.cookies.get(LEGACY_SESSION_COOKIE);
  assert.equal(expired?.value, "");
  assert.equal(expired?.maxAge, 0);
});

test("proxy clears an invalid legacy cookie and redirects protected pages to login", async () => {
  const response = await proxy(pageRequest("/dashboard/favorites", { [LEGACY_SESSION_COOKIE]: "not.a.jwt" }));
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/login\?redirect=%2Fdashboard%2Ffavorites/);
  assert.equal(response.cookies.get(LEGACY_SESSION_COOKIE)?.value, "");
});
