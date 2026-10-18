import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as session } from "@/app/api/auth/session/route";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";
import { applyIndexes, startTestDatabase, stopTestDatabase } from "./helpers/mongo";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";

before(async () => {
  await startTestDatabase();
  await applyIndexes();
});
after(stopTestDatabase);

let ipCounter = 0;
/** Each request gets its own client IP so the per-IP auth rate limits never interfere between tests. */
function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", "x-real-ip": `10.0.0.${++ipCounter}`, ...headers },
    body: JSON.stringify(body),
  });
}

const ALICE = { name: "Alice", email: "Alice@Example.com", password: "correct horse battery" };

test("signup creates the account and sets an httpOnly session cookie", async () => {
  const response = await signup(post("/api/auth/signup", ALICE));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.email, "alice@example.com");
  assert.equal(body.user.passwordHash, undefined);

  const cookie = response.cookies.get(SESSION_COOKIE);
  assert.ok(cookie?.value);
  assert.equal(cookie.httpOnly, true);
  assert.equal((await verifySessionToken(cookie.value))?.userId, body.user.id);
});

test("signing up with a taken email gives the same generic 400 as any rejected signup", async () => {
  const duplicate = await signup(post("/api/auth/signup", { ...ALICE, email: "alice@example.com", name: "Other" }));
  assert.equal(duplicate.status, 400);
  const message = String((await duplicate.json()).error).toLowerCase();
  assert.ok(!/exist|taken|already registered|in use/.test(message), message);
  assert.equal(duplicate.cookies.get(SESSION_COOKIE), undefined);

  const invalid = await signup(post("/api/auth/signup", { ...ALICE, email: "not-an-email" }));
  assert.equal(invalid.status, duplicate.status);
});

test("signup rejects unknown fields such as a smuggled role", async () => {
  const response = await signup(post("/api/auth/signup", { ...ALICE, email: "mallory@example.com", role: "admin" }));
  assert.equal(response.status, 400);
});

test("login succeeds with the right password and returns a session", async () => {
  const response = await login(post("/api/auth/login", { email: "ALICE@example.com", password: ALICE.password }));
  assert.equal(response.status, 200);
  const token = response.cookies.get(SESSION_COOKIE)?.value;
  assert.ok(token);

  const me = await session(new NextRequest("http://localhost/api/auth/session", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }));
  assert.equal((await me.json()).user?.email, "alice@example.com");
});

test("wrong password and unknown email are indistinguishable", async () => {
  const wrongPassword = await login(post("/api/auth/login", { email: "alice@example.com", password: "wrong password!" }));
  const unknownEmail = await login(post("/api/auth/login", { email: "nobody@example.com", password: "wrong password!" }));
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(await wrongPassword.json(), await unknownEmail.json());
  assert.equal(wrongPassword.cookies.get(SESSION_COOKIE), undefined);
});

test("cross-site auth posts are rejected before touching the database", async () => {
  const response = await login(post("/api/auth/login", { email: "alice@example.com", password: ALICE.password }, { "sec-fetch-site": "cross-site" }));
  assert.equal(response.status, 403);
});
