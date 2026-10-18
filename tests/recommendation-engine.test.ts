import { test } from "node:test";
import assert from "node:assert/strict";
import { explainScore, recommendMovies, scoreMovie, WEIGHTS } from "@/lib/recommendation-engine";
import { bayesianRating } from "@/lib/rating";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import type { TmdbMovieWithExtras } from "@/services/tmdb";
import type { MovieProfile } from "@/types/movie";

function profile(overrides: Partial<MovieProfile> & { id: number }): MovieProfile {
  return {
    title: `Movie ${overrides.id}`,
    posterPath: "/p.jpg",
    releaseYear: "2010",
    genreIds: [],
    genreNames: [],
    keywords: [],
    cast: [],
    directors: [],
    popularity: 10,
    voteAverage: 7,
    voteCount: 1000,
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
const CAST = ["A", "B", "C", "D", "E", "F", "G", "H"].map((name, i) => ({ id: 100 + i, name }));
const DIRECTOR_X = { id: 900, name: "Director X" };
const DIRECTOR_Y = { id: 901, name: "Director Y" };

function randomProfile(id: number, random: () => number): MovieProfile {
  const genres = GENRES.filter(() => random() < 0.35);
  return profile({
    id,
    genreIds: genres.map(([genreId]) => genreId),
    genreNames: genres.map(([, name]) => name),
    keywords: KEYWORDS.filter(() => random() < 0.3),
    cast: CAST.filter(() => random() < 0.25),
    directors: random() < 0.3 ? [DIRECTOR_X] : random() < 0.5 ? [DIRECTOR_Y] : [],
    popularity: Math.round(random() * 300),
    voteAverage: Math.round(random() * 100) / 10,
    voteCount: Math.round(random() * 5000),
  });
}

/** Independent re-implementation of the documented formula — the engine must agree with it exactly. */
const rating = (movie: MovieProfile) => bayesianRating(movie.voteAverage, movie.voteCount, 100);
const closeness = (a: number, b: number, scale: number) => Math.max(0, 1 - Math.abs(a - b) / scale);

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
    jaccard(base.cast.map((p) => p.id), candidate.cast.map((p) => p.id)) * 0.15 +
    jaccard(base.directors.map((p) => p.id), candidate.directors.map((p) => p.id)) * 0.1 +
    closeness(rating(base), rating(candidate), 3) * 0.1 +
    closeness(Math.log10(1 + base.popularity), Math.log10(1 + candidate.popularity), 2) * 0.05
  );
}

test("documented weights are unchanged and sum to 1", () => {
  assert.deepEqual(WEIGHTS, { genre: 0.35, keyword: 0.25, cast: 0.15, director: 0.1, rating: 0.1, popularity: 0.05 });
  assert.ok(Math.abs(Object.values(WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test("raw score matches the documented formula exactly", () => {
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
  const perfect = profile({ id: 2, genreIds: [878], genreNames: ["Science Fiction"] });
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
  const nolan = { id: 525, name: "Christopher Nolan" };
  const matthew = { id: 10297, name: "Matthew McConaughey" };
  const base = profile({ id: 1, genreIds: [878, 18], genreNames: ["Science Fiction", "Drama"], keywords: ["Space"], cast: [matthew], directors: [nolan], voteAverage: 8.4 });
  const candidate = profile({ id: 2, genreIds: [878], genreNames: ["Science Fiction"], keywords: ["space"], cast: [matthew], directors: [nolan], voteAverage: 8.1 });
  const labels = scoreMovie(base, candidate).reasons.map((r) => r.label);
  assert.deepEqual(labels, [
    "Also directed by Christopher Nolan",
    "Shares genres: Science Fiction",
    "Features Matthew McConaughey",
    "Similar themes: Space",
    "Similarly rated (8.1 vs 8.4)",
  ]);
});

test("scoring is deterministic", () => {
  const random = rng(99);
  const base = randomProfile(0, random);
  const candidates = Array.from({ length: 15 }, (_, i) => randomProfile(i + 1, random));
  assert.deepEqual(recommendMovies(base, candidates), recommendMovies(base, [...candidates].reverse()));
});

test("cast and directors match by TMDB id, not by name", () => {
  // Two different people who share a name must not count as a match...
  const base = profile({ id: 1, cast: [{ id: 1, name: "Chris Evans" }], directors: [{ id: 10, name: "John Lee" }] });
  const namesake = profile({ id: 2, cast: [{ id: 2, name: "Chris Evans" }], directors: [{ id: 11, name: "John Lee" }] });
  const signals = explainScore(base, namesake).signals;
  assert.equal(signals.cast, 0);
  assert.equal(signals.director, 0);

  // ...while the same person under a differently formatted name still does.
  const samePeople = profile({ id: 3, cast: [{ id: 1, name: "Christopher Evans" }], directors: [{ id: 10, name: "John LEE" }] });
  assert.equal(explainScore(base, samePeople).signals.cast, 1);
  assert.equal(explainScore(base, samePeople).signals.director, 1);
});

test("every credited director counts: co-directors overlap by Jaccard", () => {
  const joe = { id: 19271, name: "Joe Russo" };
  const anthony = { id: 19272, name: "Anthony Russo" };
  const base = profile({ id: 1, directors: [anthony, joe] });

  assert.equal(explainScore(base, profile({ id: 2, directors: [joe, anthony] })).signals.director, 1);
  assert.equal(explainScore(base, profile({ id: 3, directors: [joe] })).signals.director, 0.5);
  assert.equal(explainScore(base, profile({ id: 4, directors: [{ id: 1, name: "Someone Else" }] })).signals.director, 0);
  assert.equal(scoreMovie(base, profile({ id: 5, directors: [joe, anthony] })).reasons[0].label, "Also directed by Anthony Russo & Joe Russo");
});

test("the TMDB mapper keeps every director once and the top five billed cast, with ids", () => {
  const extras = {
    id: 299534,
    title: "Avengers: Endgame",
    poster_path: "/p.jpg",
    release_date: "2019-04-24",
    genres: [{ id: 12, name: "Adventure" }],
    keywords: { keywords: [{ id: 1, name: "superhero" }] },
    credits: {
      cast: [6, 2, 0, 4, 1, 3, 5].map((order) => ({ id: 1000 + order, name: `Actor ${order}`, character: "", profile_path: null, order })),
      crew: [
        { id: 19271, name: "Anthony Russo", job: "Director", department: "Directing" },
        { id: 19272, name: "Joe Russo", job: "Director", department: "Directing" },
        { id: 19271, name: "Anthony Russo", job: "Director", department: "Directing" },
        { id: 7, name: "A Producer", job: "Producer", department: "Production" },
      ],
    },
    popularity: 50,
    vote_average: 8.2,
    vote_count: 25000,
  } as unknown as TmdbMovieWithExtras;

  const mapped = mapExtrasToProfile(extras);
  assert.deepEqual(mapped.directors, [
    { id: 19271, name: "Anthony Russo" },
    { id: 19272, name: "Joe Russo" },
  ]);
  assert.deepEqual(mapped.cast.map((person) => person.id), [1000, 1001, 1002, 1003, 1004]);
});

test("rating is closeness of Bayesian-adjusted ratings, not a bonus for high ratings", () => {
  const seed = profile({ id: 1, voteAverage: 7.0, voteCount: 5000 });
  const same = profile({ id: 2, voteAverage: 7.0, voteCount: 5000 });
  const muchHigher = profile({ id: 3, voteAverage: 9.5, voteCount: 5000 });
  assert.equal(explainScore(seed, same).signals.rating, 1);
  // A higher-rated movie is *less* similar to a 7.0 seed, not more.
  assert.ok(explainScore(seed, muchHigher).signals.rating < 0.25);

  // A 9.0 backed by three votes is shrunk toward 6.5, so it no longer looks like a 9.0 classic.
  const classic = profile({ id: 4, voteAverage: 8.8, voteCount: 20000 });
  const thinlyVoted = profile({ id: 5, voteAverage: 9.0, voteCount: 3 });
  const wellVoted = profile({ id: 6, voteAverage: 8.6, voteCount: 15000 });
  assert.ok(explainScore(classic, wellVoted).signals.rating > 0.9);
  assert.ok(explainScore(classic, thinlyVoted).signals.rating < 0.35);
});

test("popularity is closeness on a log scale, so blockbusters don't win by default", () => {
  const cultFavourite = profile({ id: 1, popularity: 5 });
  const similarCult = profile({ id: 2, popularity: 6 });
  const blockbuster = profile({ id: 3, popularity: 800 });
  assert.ok(explainScore(cultFavourite, similarCult).signals.popularity > 0.95);
  // More than two orders of magnitude apart → no popularity similarity.
  assert.equal(explainScore(cultFavourite, blockbuster).signals.popularity, 0);
  // Symmetric.
  assert.equal(explainScore(blockbuster, cultFavourite).signals.popularity, explainScore(cultFavourite, blockbuster).signals.popularity);
});
