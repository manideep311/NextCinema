import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as listFavorites } from "@/app/api/favorites/route";
import { GET as currentSession } from "@/app/api/auth/session/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { SESSION_COOKIE, signSessionToken } from "@/lib/auth/token";
import { insertTestUser, startTestDatabase, stopTestDatabase } from "./helpers/mongo";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";

const USER = { userId: "65f0c0ffee0000000000cccc", email: "c@example.com", name: "Cy", role: "user" as const };

before(async () => {
  await startTestDatabase();
  await insertTestUser(USER);
});
after(stopTestDatabase);

function request(url: string, token: string, method = "GET") {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { cookie: `${SESSION_COOKIE}=${token}`, "sec-fetch-site": "same-origin" },
  });
}

test("after sign-out, an earlier token is rejected by every authenticated API call — not only at renewal", async () => {
  // A fresh token (no renewal due), copied before the user signs out.
  const copied = await signSessionToken({ ...USER, tokenVersion: 0 });
  assert.equal((await listFavorites(request("/api/favorites", copied))).status, 200);
  assert.equal((await (await currentSession(request("/api/auth/session", copied))).json()).user?.email, USER.email);

  assert.equal((await logout(request("/api/auth/logout", copied, "POST"))).status, 200);

  assert.equal((await listFavorites(request("/api/favorites", copied))).status, 401);
  assert.equal((await (await currentSession(request("/api/auth/session", copied))).json()).user, null);

  // Signing in again issues a token at the new version, which works.
  const fresh = await signSessionToken({ ...USER, tokenVersion: 1 });
  assert.equal((await listFavorites(request("/api/favorites", fresh))).status, 200);
});

test("if the revocation check can't reach the database, user-data routes fail closed with 503", async () => {
  const { closeDb } = await import("@/lib/db");
  const workingUri = process.env.MONGODB_URI;
  await closeDb();
  process.env.MONGODB_URI = "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=200&connectTimeoutMS=200";
  try {
    const token = await signSessionToken({ ...USER, tokenVersion: 1 });
    const response = await listFavorites(request("/api/favorites", token));
    assert.equal(response.status, 503);
    // ...while the "who am I" endpoint keeps the session rather than signing the client out over a blip.
    assert.equal((await (await currentSession(request("/api/auth/session", token))).json()).user?.email, USER.email);
  } finally {
    await closeDb();
    process.env.MONGODB_URI = workingUri;
  }
});
