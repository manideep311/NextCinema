import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { proxy } from "@/proxy";
import { POST as logout } from "@/app/api/auth/logout/route";
import { SESSION_COOKIE, SESSION_RENEW_AFTER_SECONDS, signSessionToken, verifySessionToken } from "@/lib/auth/token";
import { getTokenVersion, revokeSessions } from "@/services/auth";
import { startTestDatabase, stopTestDatabase } from "./helpers/mongo";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";
const KEY = new TextEncoder().encode(process.env.AUTH_SECRET);

const USER_ID = "65f0c0ffee0000000000beef";
const PAYLOAD = { userId: USER_ID, email: "b@example.com", name: "Bo", role: "user" as const };

before(async () => {
  await startTestDatabase();
  const { getUsersCollection } = await import("@/lib/db");
  // No tokenVersion field: documents created before versioning must count as version 0.
  await (await getUsersCollection()).insertOne({
    _id: new ObjectId(USER_ID),
    email: PAYLOAD.email,
    passwordHash: "unused",
    name: PAYLOAD.name,
    avatarUrl: null,
    role: "user",
    createdAt: new Date(),
  });
});

/** A token issued long enough ago that the proxy wants to renew it. */
function staleToken(tokenVersion: number) {
  return signSessionToken({ ...PAYLOAD, tokenVersion }, Date.now() - (SESSION_RENEW_AFTER_SECONDS + 60) * 1000);
}

function pageRequest(token: string) {
  return new NextRequest("http://localhost/dashboard", { headers: { cookie: `${SESSION_COOKIE}=${token}; nc_intro_seen=1` } });
}

after(stopTestDatabase);

test("tokens carry the version they were issued with; pre-versioning tokens read as version 0", async () => {
  assert.equal((await verifySessionToken(await signSessionToken({ ...PAYLOAD, tokenVersion: 3 })))?.tokenVersion, 3);

  const legacy = await new SignJWT({ email: PAYLOAD.email, name: PAYLOAD.name, role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(USER_ID)
    .setIssuer("nextcinema")
    .setAudience("nextcinema:web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(KEY);
  assert.equal((await verifySessionToken(legacy))?.tokenVersion, 0);
});

test("a user document without tokenVersion is at version 0", async () => {
  assert.equal(await getTokenVersion(USER_ID), 0);
  assert.equal(await getTokenVersion("65f0c0ffee0000000000ffff"), null);
});

test("the proxy renews a stale token whose version is current", async () => {
  const response = await proxy(pageRequest(await staleToken(0)));
  const renewed = response.cookies.get(SESSION_COOKIE)?.value;
  assert.ok(renewed, "renewed cookie set");
  assert.equal((await verifySessionToken(renewed))?.tokenVersion, 0);
});

test("logout revokes every earlier token: the proxy then clears instead of renewing", async () => {
  const token = await staleToken(0);
  const response = await logout(
    new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=${token}`, "sec-fetch-site": "same-origin" },
    })
  );
  assert.equal(response.status, 200);
  assert.equal(await getTokenVersion(USER_ID), 1);

  // A copy of the old token (say, from another device) is no longer renewed.
  const afterLogout = await proxy(pageRequest(token));
  const cookie = afterLogout.cookies.get(SESSION_COOKIE);
  assert.equal(cookie?.value, "");
  assert.equal(cookie?.maxAge, 0);

  // A token issued after the bump (a fresh sign-in) renews normally.
  const fresh = await proxy(pageRequest(await staleToken(1)));
  assert.ok(fresh.cookies.get(SESSION_COOKIE)?.value);
});

test("a deleted account's token is cleared at renewal", async () => {
  await revokeSessions(USER_ID);
  const { getUsersCollection } = await import("@/lib/db");
  await (await getUsersCollection()).deleteOne({ _id: new ObjectId(USER_ID) });
  const response = await proxy(pageRequest(await staleToken(2)));
  assert.equal(response.cookies.get(SESSION_COOKIE)?.value, "");
});
