import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/favorites/route";
import { SESSION_COOKIE, signSessionToken } from "@/lib/auth/token";
import { addFavorite, listRecentFavorites } from "@/services/favorites";
import { applyIndexes, insertTestUser, startTestDatabase, stopTestDatabase } from "./helpers/mongo";

process.env.AUTH_SECRET = "test-secret-that-is-definitely-longer-than-32-chars";
process.env.TMDB_API_READ_ACCESS_TOKEN = "test-token";

const ALICE = { userId: "65f0c0ffee0000000000aaaa", email: "a@example.com", name: "Alice", role: "user" as const, tokenVersion: 0 };
const BOB = { userId: "65f0c0ffee0000000000bbbb", email: "b@example.com", name: "Bob", role: "user" as const, tokenVersion: 0 };

// Movie snapshots are resolved server-side from TMDB; a stub answers those requests.
const realFetch = globalThis.fetch;
before(async () => {
  await startTestDatabase();
  await applyIndexes();
  await insertTestUser(ALICE);
  await insertTestUser(BOB);
  globalThis.fetch = (async (input: string | URL | Request) => {
    const id = Number(new URL(String(input)).pathname.split("/").pop());
    if (id === 404) return new Response(JSON.stringify({ status_message: "not found" }), { status: 404 });
    return new Response(
      JSON.stringify({ id, title: `Movie ${id}`, poster_path: `/${id}.jpg`, vote_average: 7.5, release_date: "2014-11-05", adult: false }),
      { status: 200 }
    );
  }) as typeof fetch;
});
after(async () => {
  globalThis.fetch = realFetch;
  await stopTestDatabase();
});
beforeEach(async () => {
  const { getFavoritesCollection } = await import("@/lib/db");
  await (await getFavoritesCollection()).deleteMany({});
});

async function call(handler: (request: NextRequest) => Promise<Response>, method: string, user: typeof ALICE | null, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json", "sec-fetch-site": "same-origin" };
  if (user) headers.cookie = `${SESSION_COOKIE}=${await signSessionToken(user)}`;
  const response = await handler(
    new NextRequest("http://localhost/api/favorites", { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  );
  return { status: response.status, body: await response.json() };
}

test("favorites require a session", async () => {
  assert.equal((await call(GET, "GET", null)).status, 401);
  assert.equal((await call(POST, "POST", null, { movieId: 1 })).status, 401);
});

test("add, list and remove a favorite, with the snapshot resolved from TMDB rather than the request", async () => {
  const added = await call(POST, "POST", ALICE, { movieId: 157336 });
  assert.equal(added.status, 200);
  assert.equal(added.body.movie.title, "Movie 157336");

  const listed = await call(GET, "GET", ALICE);
  assert.deepEqual(
    listed.body.favorites.map((m: { id: number; title: string; releaseYear: string }) => [m.id, m.title, m.releaseYear]),
    [[157336, "Movie 157336", "2014"]]
  );

  assert.equal((await call(DELETE, "DELETE", ALICE, { movieId: 157336 })).status, 200);
  assert.deepEqual((await call(GET, "GET", ALICE)).body.favorites, []);
});

test("adding the same favorite twice keeps one row", async () => {
  await call(POST, "POST", ALICE, { movieId: 27205 });
  await call(POST, "POST", ALICE, { movieId: 27205 });
  assert.equal((await call(GET, "GET", ALICE)).body.favorites.length, 1);
});

test("a client can't plant a title, or act on another user's list", async () => {
  assert.equal((await call(POST, "POST", ALICE, { movieId: 1, title: "Fake", userId: BOB.userId })).status, 400);

  await call(POST, "POST", ALICE, { movieId: 550 });
  assert.deepEqual((await call(GET, "GET", BOB)).body.favorites, []);
  await call(DELETE, "DELETE", BOB, { movieId: 550 });
  assert.equal((await call(GET, "GET", ALICE)).body.favorites.length, 1);
});

test("unknown movies are a 404 and nothing is stored", async () => {
  assert.equal((await call(POST, "POST", ALICE, { movieId: 404 })).status, 404);
  assert.deepEqual((await call(GET, "GET", ALICE)).body.favorites, []);
});

test("For You seeds are the newest favorites first, capped at the limit", async () => {
  for (const id of [1, 2, 3, 4, 5, 6]) {
    await addFavorite(ALICE.userId, { id, title: `Movie ${id}`, posterPath: null, voteAverage: 7, releaseYear: "2010" });
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.deepEqual((await listRecentFavorites(ALICE.userId, 5)).map((seed) => seed.id), [6, 5, 4, 3, 2]);
  assert.deepEqual(await listRecentFavorites(BOB.userId, 5), []);
});
