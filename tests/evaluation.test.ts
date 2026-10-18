import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSeed, ndcgAtK, precisionAtK, rankByGenreJaccard, rankBySimilarOrder, summarize } from "@/lib/evaluation";
import type { TmdbMovieWithExtras } from "@/services/tmdb";
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
    vote_count: 1000,
    popularity: 20,
    genre_ids: [878],
    adult: false,
    original_language: "en",
    ...overrides,
  } as TmdbMovie;
}

function extras(id: number, genreIds: number[], keywords: string[] = []): TmdbMovieWithExtras {
  return {
    ...movie(id, { genre_ids: genreIds }),
    genres: genreIds.map((g) => ({ id: g, name: `Genre ${g}` })),
    keywords: { keywords: keywords.map((name, i) => ({ id: i, name })) },
    credits: { cast: [], crew: [] },
  } as unknown as TmdbMovieWithExtras;
}

test("precision@k counts relevant items in the top k", () => {
  const relevant = new Set([1, 3, 99]);
  assert.equal(precisionAtK([1, 2, 3, 4], relevant, 4), 0.5);
  assert.equal(precisionAtK([5, 6], relevant, 10), 0);
});

test("nDCG@k is 1 for a perfect ranking and discounts later hits", () => {
  const relevant = new Set([1, 2]);
  assert.equal(ndcgAtK([1, 2, 3], relevant, 3), 1);
  const late = ndcgAtK([3, 1, 2], relevant, 3);
  const ideal = 1 + 1 / Math.log2(3);
  assert.ok(Math.abs(late - (1 / Math.log2(3) + 1 / Math.log2(4)) / ideal) < 1e-12);
  assert.equal(ndcgAtK([1], new Set(), 10), 0);
});

test("baselines: /similar order keeps TMDB's order; genre Jaccard ranks by overlap", () => {
  const pool = [movie(3), movie(1), movie(2)];
  assert.deepEqual(rankBySimilarOrder([movie(2), movie(1)], pool), [2, 1, 3]);

  const genrePool = [movie(1, { genre_ids: [35] }), movie(2, { genre_ids: [878, 18] }), movie(3, { genre_ids: [878] })];
  assert.deepEqual(rankByGenreJaccard([878, 18], genrePool), [2, 3, 1]);
});

test("the evaluation pool never includes /recommendations-only movies (no leakage)", () => {
  const seed = extras(1, [878, 18], ["space"]);
  const similar = [movie(10), movie(11)];
  const discover = [movie(20)];
  // 30 appears only in the ground truth: it must not be rankable by any method.
  const groundTruth = [movie(10), movie(30)];
  const profiles = new Map([10, 11, 20, 30].map((id) => [id, extras(id, [878, 18], ["space"])] as const));

  const result = evaluateSeed({ seed, similar, discover, groundTruth, profiles }, TODAY);
  assert.equal(result.poolSize, 3);
  assert.equal(result.groundTruthSize, 2);
  assert.equal(result.reachable, 1);
  assert.equal(result.reachableViaSimilar, 1);
  for (const method of ["tmdbSimilar", "genreJaccard", "engine"] as const) {
    assert.ok(result.scores[method].precision <= 0.1 + 1e-12, method);
  }
});

test("candidates without a fetched profile are dropped for every method alike", () => {
  const seed = extras(1, [878]);
  const result = evaluateSeed(
    { seed, similar: [movie(10), movie(11)], discover: [], groundTruth: [movie(11)], profiles: new Map([[10, extras(10, [878])]]) },
    TODAY
  );
  assert.equal(result.poolSize, 1);
  assert.equal(result.reachable, 0);
});

test("summary averages only seeds with ground truth and reports the pool ceiling", () => {
  const base = { seedTitle: "x", poolSize: 30, reachable: 5, reachableViaSimilar: 1 };
  const scores = (p: number) => ({ tmdbSimilar: { precision: p, ndcg: p }, genreJaccard: { precision: p, ndcg: p }, engine: { precision: p, ndcg: p } });
  const summary = summarize([
    { ...base, seedId: 1, groundTruthSize: 10, scores: scores(0.4) },
    { ...base, seedId: 2, groundTruthSize: 10, scores: scores(0.2) },
    { ...base, seedId: 3, groundTruthSize: 0, scores: scores(0) },
  ]);
  assert.equal(summary.seeds, 2);
  assert.ok(Math.abs(summary.methods.engine.precision - 0.3) < 1e-12);
  assert.equal(summary.precisionCeiling, 0.5);
});
