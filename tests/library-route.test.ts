import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createLibraryRoutes } from "@/lib/library-route";
import { SESSION_COOKIE, signSessionToken } from "@/lib/auth/token";
import { insertTestUser, startTestDatabase, stopTestDatabase } from "./helpers/mongo";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";

const USER = { userId: "65f0c0ffee0000000000abcd", email: "a@example.com", name: "Alice", role: "user" as const, tokenVersion: 0 };

// The session itself must check out (the user exists, token not revoked) so that only the injected service fails.
before(async () => {
  await startTestDatabase();
  await insertTestUser(USER);
});
after(stopTestDatabase);

async function request(method: "GET" | "DELETE", body?: unknown) {
  const token = await signSessionToken(USER);
  return new NextRequest("http://localhost/api/favorites", {
    method,
    headers: { cookie: `${SESSION_COOKIE}=${token}`, "content-type": "application/json", "sec-fetch-site": "same-origin" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const failingService = {
  list: async () => {
    throw new Error("db down");
  },
  add: async () => {},
  remove: async () => {
    throw new Error("db down");
  },
};

test("library GET returns a JSON 503 (not an unhandled throw) when the database fails", async () => {
  const { GET } = createLibraryRoutes("favorites", failingService);
  const response = await GET(await request("GET"));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /couldn't load/i);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("library DELETE returns a JSON 503 when the database fails", async () => {
  const { DELETE } = createLibraryRoutes("favorites", failingService);
  const response = await DELETE(await request("DELETE", { movieId: 157336 }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /couldn't remove/i);
});
