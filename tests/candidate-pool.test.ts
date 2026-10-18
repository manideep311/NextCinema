import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCandidatePool, MAX_CANDIDATES, seedDiscoverGenres } from "@/lib/candidate-pool";
import type { TmdbMovie } from "@/types/tmdb";

const TODAY = "2026-10-18";

function movie(id: number, overrides: Partial<TmdbMovie> = {}): TmdbMovie {
  return {
    id,
    title: `Movie ${id}`,
    overview: "",
    poster_path: "/p.jpg",
    backdrop_path: null,
    release_date: "2010-01-01",
    vote_average: 7,
    vote_count: 100,
    popularity: 10,
    genre_ids: [],
    adult: false,
    original_language: "en",
    ...overrides,
  } as TmdbMovie;
}

const ids = (movies: TmdbMovie[]) => movies.map((m) => m.id);

test("sources are interleaved round-robin and de-duplicated, first occurrence winning", () => {
  const similar = [movie(1), movie(2), movie(3)];
  const recommendations = [movie(2), movie(10), movie(11)];
  const discover = [movie(20), movie(1), movie(21)];
  assert.deepEqual(ids(buildCandidatePool(99, [similar, recommendations, discover], TODAY)), [1, 2, 20, 10, 3, 11, 21]);
});

test("the cap keeps every source represented", () => {
  const similar = Array.from({ length: 40 }, (_, i) => movie(i + 1));
  const recommendations = Array.from({ length: 20 }, (_, i) => movie(100 + i));
  const discover = Array.from({ length: 20 }, (_, i) => movie(200 + i));
  const pool = buildCandidatePool(999, [similar, recommendations, discover], TODAY);
  assert.equal(pool.length, MAX_CANDIDATES);
  assert.ok(pool.some((m) => m.id >= 100 && m.id < 200));
  assert.ok(pool.some((m) => m.id >= 200));
});

test("the seed, adult, poster-less and unreleased titles are dropped; low vote counts are kept", () => {
  const pool = buildCandidatePool(
    1,
    [[movie(1), movie(2, { adult: true }), movie(3, { poster_path: null }), movie(4, { release_date: "2027-05-01" }), movie(5, { release_date: "" }), movie(6, { vote_count: 2 })]],
    TODAY
  );
  assert.deepEqual(ids(pool), [6]);
});

test("discover uses the seed's first two genres combined with AND", () => {
  assert.equal(seedDiscoverGenres([878, 18, 12]), "878,18");
  assert.equal(seedDiscoverGenres([35]), "35");
  assert.equal(seedDiscoverGenres([]), null);
});
