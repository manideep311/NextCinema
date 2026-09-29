import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annotateWatchState,
  buildCuratedJourney,
  buildRankedJourney,
  computeProgress,
  orderMembers,
  passesRules,
  rulesToDiscoverParams,
  type JourneyCandidate,
} from "@/lib/journeys/engine";
import { getJourneyDefinition } from "@/lib/journeys/definitions";
import type { JourneyDefinition, ResolvedJourneyMovie } from "@/types/journey";

const NOW = Date.parse("2026-09-28T12:00:00Z");

function candidate(id: number, overrides: Partial<JourneyCandidate> = {}): JourneyCandidate {
  return {
    id,
    title: `Film ${id}`,
    releaseDate: "2005-06-01",
    posterPath: `/poster-${id}.jpg`,
    overview: "An overview.",
    voteAverage: 7.5,
    voteCount: 2000,
    popularity: 30,
    genreIds: [878],
    originalLanguage: "en",
    ...overrides,
  };
}

const RANKED: JourneyDefinition = {
  id: "test-ranked",
  type: "genre",
  name: "Test",
  shortName: "Test",
  description: "",
  source: { kind: "discover", sortBy: "vote_average.desc" },
  rules: { genres: [878], excludeGenres: [27], minVotes: 100, minRating: 7 },
  ranking: { quality: 0.6, consensus: 0.4 },
  selection: { maxMovies: 6, perDecadeCap: 2 },
  minimumMovies: 4,
  freshness: "daily",
};

test("rules reject unreleased, off-genre, excluded-genre, and under-voted movies", () => {
  const rules = RANKED.rules;
  assert.equal(passesRules(candidate(1), rules, NOW), true);
  assert.equal(passesRules(candidate(2, { releaseDate: "2027-01-01" }), rules, NOW), false);
  assert.equal(passesRules(candidate(3, { releaseDate: null }), rules, NOW), false);
  assert.equal(passesRules(candidate(4, { genreIds: [18] }), rules, NOW), false);
  assert.equal(passesRules(candidate(5, { genreIds: [878, 27] }), rules, NOW), false);
  assert.equal(passesRules(candidate(6, { voteCount: 50 }), rules, NOW), false);
  assert.equal(passesRules(candidate(7, { voteAverage: 6.9 }), rules, NOW), false);
});

test("language and rolling-window rules are enforced locally", () => {
  assert.equal(passesRules(candidate(1, { originalLanguage: "hi" }), { languages: ["te"] }, NOW), false);
  assert.equal(passesRules(candidate(2, { originalLanguage: "fr" }), { excludeLanguages: ["en"] }, NOW), true);
  assert.equal(passesRules(candidate(3, { releaseDate: "2026-08-01" }), { releasedWithinDays: 120 }, NOW), true);
  assert.equal(passesRules(candidate(4, { releaseDate: "2025-01-01" }), { releasedWithinDays: 120 }, NOW), false);
});

test("rules translate to TMDB discover params (always bounded to released titles)", () => {
  const params = rulesToDiscoverParams({ genres: [878], excludeGenres: [27, 10770], minVotes: 100, releasedWithinDays: 30, minRuntime: 60 }, NOW);
  assert.equal(params.with_genres, "878");
  assert.equal(params.without_genres, "27,10770");
  assert.equal(params["vote_count.gte"], "100");
  assert.equal(params["with_runtime.gte"], "60");
  assert.equal(params["primary_release_date.lte"], "2026-09-28");
  assert.equal(params["primary_release_date.gte"], "2026-08-29");
  assert.equal(rulesToDiscoverParams({ anyGenres: [35, 10751] }, NOW).with_genres, "35|10751");
});

test("insufficient candidates hide the journey instead of padding it", () => {
  const result = buildRankedJourney(RANKED, [candidate(1), candidate(2, { genreIds: [18] }), candidate(3)], NOW);
  assert.equal(result.status, "insufficient");
});

test("selection respects the per-decade cap, max size, and returns release order", () => {
  const pool = [
    ...[1, 2, 3, 4].map((id) => candidate(id, { releaseDate: `198${id}-01-01`, voteAverage: 8 + id / 10 })),
    ...[5, 6, 7].map((id) => candidate(id, { releaseDate: `199${id}-01-01` })),
    ...[8, 9, 10].map((id) => candidate(id, { releaseDate: `200${id - 7}-01-01` })),
  ];
  const result = buildRankedJourney(RANKED, pool, NOW);
  assert.equal(result.status, "available");
  if (result.status !== "available") return;
  assert.equal(result.members.length, 6);
  const decades = result.members.map((m) => `${m.releaseYear.slice(0, 3)}0s`);
  for (const decade of new Set(decades)) assert.ok(decades.filter((d) => d === decade).length <= 2);
  const years = result.members.map((m) => m.releaseYear);
  assert.deepEqual(years, [...years].sort());
  assert.deepEqual(result.members.map((m) => m.releaseOrder), [1, 2, 3, 4, 5, 6]);
});

test("membership is deterministic regardless of candidate order, and duplicates collapse", () => {
  const pool = Array.from({ length: 12 }, (_, i) =>
    candidate(i + 1, { releaseDate: `19${70 + i * 4}-05-05`, voteAverage: 7 + (i % 5) / 5, voteCount: 500 + i * 37 })
  );
  const withDuplicates = [...pool, pool[0], { ...pool[1] }, candidate(99, { title: pool[2].title, releaseDate: pool[2].releaseDate, voteCount: 10 })];
  const a = buildRankedJourney(RANKED, withDuplicates, NOW);
  const b = buildRankedJourney(RANKED, [...withDuplicates].reverse(), NOW);
  assert.deepEqual(a, b);
  if (a.status === "available") {
    const ids = a.members.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(!ids.includes(99));
  }
});

test("curated journeys keep documented order and placeholders for unresolved titles", () => {
  const definition = getJourneyDefinition("mcu-infinity-saga")!;
  assert.equal(definition.source.kind, "curated");
  if (definition.source.kind !== "curated") return;
  const movies = definition.source.movies;
  const resolutions = movies.map((movie, i) => ({ movie, candidate: i === 3 ? null : candidate(1000 + i) }));
  const result = buildCuratedJourney(definition, resolutions);
  assert.equal(result.status, "available");
  if (result.status !== "available") return;
  assert.equal(result.members.length, 23);
  assert.equal(result.members[3].id, null);

  const chronological = orderMembers(result.members, "chronological");
  assert.equal(chronological[0].title, "Captain America: The First Avenger");
  assert.equal(chronological[1].title, "Captain Marvel");
  const essential = orderMembers(result.members, "essential");
  assert.ok(essential.every((m) => m.isEssential));
  assert.equal(essential.length, movies.filter((m) => m.isEssential).length);
});

test("curated journey is hidden when too few titles resolve", () => {
  const definition = getJourneyDefinition("lord-of-the-rings")!;
  if (definition.source.kind !== "curated") return;
  const resolutions = definition.source.movies.map((movie, i) => ({ movie, candidate: i === 0 ? candidate(1) : null }));
  assert.equal(buildCuratedJourney(definition, resolutions).status, "insufficient");
});

test("watch state: first unwatched in the chosen order is 'next'; progress counts only watched", () => {
  const movies = [1, 2, 3, 4].map((id) => ({ id, releaseOrder: id }));
  const annotated = annotateWatchState(movies, new Set([1, 3]));
  assert.deepEqual(annotated.map((m) => m.state), ["watched", "next", "watched", "upcoming"]);

  const progress = computeProgress(annotated as unknown as ResolvedJourneyMovie[]);
  assert.equal(progress.watchedCount, 2);
  assert.equal(progress.totalCount, 4);
  assert.equal(progress.nextMovie?.id, 2);

  const done = computeProgress(annotateWatchState(movies, new Set([1, 2, 3, 4])) as unknown as ResolvedJourneyMovie[]);
  assert.equal(done.nextMovie, null);
});
