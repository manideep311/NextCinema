import { test } from "node:test";
import assert from "node:assert/strict";
import { explainScore, recommendMovies, scoreMovie, WEIGHTS } from "@/lib/recommendation-engine";
import type { MovieProfile } from "@/types/movie";

function profile(overrides: Partial<MovieProfile> & { id: number }): MovieProfile {
  return {
    title: `Movie ${overrides.id}`,
    posterPath: "/p.jpg",
    releaseYear: "2010",
    genreIds: [],
    genreNames: [],
    keywords: [],
    castNames: [],
    director: null,
    popularity: 10,
    voteAverage: 7,
    ...overrides,
  };
}

// Deterministic pseudo-random generator so fixtures are reproducible.
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const GENRES = [[28, "Action"], [12, "Adventure"], [878, "Science Fiction"], [18, "Drama"], [53, "Thriller"], [35, "Comedy"]] as const;
const KEYWORDS = ["space", "time travel", "father daughter", "heist", "dystopia", "robot", "love", "revenge"];
const CAST = ["A", "B", "C", "D", "E", "F", "G", "H"];

function randomProfile(id: number, random: () => number): MovieProfile {
  const genres = GENRES.filter(() => random() < 0.35);
  return profile({
    id,
    genreIds: genres.map(([genreId]) => genreId),
    genreNames: genres.map(([, name]) => name),
    keywords: KEYWORDS.filter(() => random() < 0.3),
    castNames: CAST.filter(() => random() < 0.25),
    director: random() < 0.3 ? "Director X" : random() < 0.5 ? "Director Y" : null,
    popularity: Math.round(random() * 300),
    voteAverage: Math.round(random() * 100) / 10,
  });
}

/** The original (pre-optimization) weighted sum — the reference the new engine must rank identically to. */
function referenceRaw(base: MovieProfile, candidate: MovieProfile): number {
  const jaccard = (a: (string | number)[], b: (string | number)[]) => {
    if (!a.length || !b.length) return 0;
    const norm = (v: string | number) => (typeof v === "string" ? v.toLowerCase() : v);
    const setA = new Set(a.map(norm));
    const setB = new Set(b.map(norm));
    const inter = [...setA].filter((v) => setB.has(v)).length;
    return inter / new Set([...setA, ...setB]).size;
  };
  return (
    jaccard(base.genreIds, candidate.genreIds) * 0.35 +
    jaccard(base.keywords, candidate.keywords) * 0.25 +
    jaccard(base.castNames, candidate.castNames) * 0.15 +
    (base.director && base.director === candidate.director ? 1 : 0) * 0.1 +
    Math.min(1, candidate.popularity / 100) * 0.05 +
    Math.min(1, candidate.voteAverage / 10) * 0.1
  );
}

test("documented weights are unchanged and sum to 1", () => {
  assert.deepEqual(WEIGHTS, { genre: 0.35, keyword: 0.25, cast: 0.15, director: 0.1, rating: 0.1, popularity: 0.05 });
  assert.ok(Math.abs(Object.values(WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test("raw score matches the original algorithm exactly", () => {
  const random = rng(42);
  for (let i = 0; i < 200; i++) {
    const base = randomProfile(1, random);
    const candidate = randomProfile(2, random);
    assert.ok(Math.abs(explainScore(base, candidate).raw - referenceRaw(base, candidate)) < 1e-12);
  }
});

test("normalization never changes the ranking", () => {
  const random = rng(7);
  for (let trial = 0; trial < 50; trial++) {
    const base = randomProfile(0, random);
    const candidates = Array.from({ length: 20 }, (_, i) => randomProfile(i + 1, random));
    const ranked = recommendMovies(base, candidates, 20).map((s) => s.movie.id);
    const reference = [...candidates]
      .sort(
        (a, b) =>
          Math.round(referenceRaw(base, b) * 1e9) - Math.round(referenceRaw(base, a) * 1e9) ||
          b.voteAverage - a.voteAverage ||
          a.id - b.id
      )
      .map((m) => m.id);
    assert.deepEqual(ranked, reference);
  }
});

test("% match is 0–100 and normalized over signals the base movie actually has", () => {
  // Base has no keywords, cast, or director: only genre, rating, popularity are achievable.
  const base = profile({ id: 1, genreIds: [878], genreNames: ["Science Fiction"] });
  const perfect = profile({ id: 2, genreIds: [878], genreNames: ["Science Fiction"], popularity: 500, voteAverage: 10 });
  const breakdown = explainScore(base, perfect);
  assert.ok(Math.abs(breakdown.applicableWeight - (0.35 + 0.1 + 0.05)) < 1e-12);
  assert.equal(scoreMovie(base, perfect).score, 100);

  const random = rng(3);
  for (let i = 0; i < 100; i++) {
    const s = scoreMovie(randomProfile(1, random), randomProfile(2, random)).score;
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 100);
  }
});

test("recommendMovies drops the base movie and duplicate candidates", () => {
  const base = profile({ id: 1, genreIds: [18] });
  const dup = profile({ id: 2, genreIds: [18] });
  const result = recommendMovies(base, [base, dup, dup, profile({ id: 3 })], 10);
  assert.deepEqual(result.map((r) => r.movie.id).sort(), [2, 3]);
});

test("reasons are built from real overlapping data", () => {
  const base = profile({ id: 1, genreIds: [878, 18], genreNames: ["Science Fiction", "Drama"], keywords: ["Space"], castNames: ["Matthew"], director: "Nolan" });
  const candidate = profile({ id: 2, genreIds: [878], genreNames: ["Science Fiction"], keywords: ["space"], castNames: ["matthew"], director: "Nolan", voteAverage: 8.1 });
  const labels = scoreMovie(base, candidate).reasons.map((r) => r.label);
  assert.deepEqual(labels, [
    "Also directed by Nolan",
    "Shares genres: Science Fiction",
    "Features Matthew",
    "Similar themes: Space",
    "Highly rated (8.1/10)",
  ]);
});

test("scoring is deterministic", () => {
  const random = rng(99);
  const base = randomProfile(0, random);
  const candidates = Array.from({ length: 15 }, (_, i) => randomProfile(i + 1, random));
  assert.deepEqual(recommendMovies(base, candidates), recommendMovies(base, [...candidates].reverse()));
});
