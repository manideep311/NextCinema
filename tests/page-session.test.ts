import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { SESSION_COOKIE, signSessionToken } from "@/lib/auth/token";
import { revokeSessions } from "@/services/auth";
import { insertTestUser, startTestDatabase, stopTestDatabase } from "./helpers/mongo";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";

const USER = { userId: "65f0c0ffee0000000000dddd", email: "d@example.com", name: "Dee", role: "user" as const };

// getSession reads the request's cookies through next/headers and lib/auth/session.ts
// imports next/navigation; both need Next's request scope, so they're stubbed here
// (node:test module mocks) and the real getSession runs against an in-memory MongoDB.
let cookieJar: Record<string, string> = {};
mock.module("next/headers", {
  namedExports: { cookies: async () => ({ get: (name: string) => (name in cookieJar ? { value: cookieJar[name] } : undefined) }) },
});
mock.module("next/navigation", {
  namedExports: {
    redirect: (url: string) => {
      throw new Error(`redirect:${url}`);
    },
  },
});

before(async () => {
  await startTestDatabase();
  await insertTestUser(USER);
});
after(stopTestDatabase);

test("getSession returns null for a token revoked by sign-out, and requirePageSession redirects", async () => {
  const { getSession, requirePageSession } = await import("@/lib/auth/session");
  const copied = await signSessionToken({ ...USER, tokenVersion: 0 });
  cookieJar = { [SESSION_COOKIE]: copied };
  assert.equal((await getSession())?.userId, USER.userId);

  await revokeSessions(USER.userId);

  assert.equal(await getSession(), null);
  await assert.rejects(requirePageSession("/dashboard/recent"), /redirect:\/login\?redirect=%2Fdashboard%2Frecent/);

  // A token issued at the new version (a fresh sign-in) still works.
  cookieJar = { [SESSION_COOKIE]: await signSessionToken({ ...USER, tokenVersion: 1 }) };
  assert.equal((await getSession())?.userId, USER.userId);
});

test("getSession keeps a valid session when the version lookup can't reach the database", async () => {
  const { getSession } = await import("@/lib/auth/session");
  const { closeDb } = await import("@/lib/db");
  const workingUri = process.env.MONGODB_URI;
  cookieJar = { [SESSION_COOKIE]: await signSessionToken({ ...USER, tokenVersion: 1 }) };
  await closeDb();
  process.env.MONGODB_URI = "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=200&connectTimeoutMS=200";
  try {
    assert.equal((await getSession())?.userId, USER.userId);
  } finally {
    await closeDb();
    process.env.MONGODB_URI = workingUri;
  }
});
