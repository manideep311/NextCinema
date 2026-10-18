import { buildCandidatePool } from "@/lib/candidate-pool";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { adjustedRating, recommendMovies } from "@/lib/recommendation-engine";
import type { TmdbMovieWithExtras } from "@/services/tmdb";
import type { TmdbMovie } from "@/types/tmdb";

// Pure offline-evaluation logic for scripts/evaluate-recommendations.ts.
// Everything here works on already-fetched TMDB data, so it is unit-tested
// (tests/evaluation.test.ts) and the script only does I/O and reporting.

export const EVAL_K = 10;

export const METHODS = ["tmdbSimilar", "genreJaccard", "engine"] as const;
export type MethodName = (typeof METHODS)[number];

export const METHOD_LABELS: Record<MethodName, string> = {
  tmdbSimilar: "TMDB /similar order",
  genreJaccard: "Genre-only Jaccard",
  engine: "NextCinema engine",
};

/** Fraction of the top k that is relevant. */
export function precisionAtK(ranked: number[], relevant: ReadonlySet<number>, k: number = EVAL_K): number {
  let hits = 0;
  for (const id of ranked.slice(0, k)) if (relevant.has(id)) hits++;
  return hits / k;
}

/**
 * Binary-relevance nDCG@k: DCG = Σ rel_i / log2(i + 1) over the top k,
 * divided by the DCG of a perfect ranking, which places min(k, |relevant|)
 * relevant items first. 0 when nothing is relevant.
 */
export function ndcgAtK(ranked: number[], relevant: ReadonlySet<number>, k: number = EVAL_K): number {
  let dcg = 0;
  ranked.slice(0, k).forEach((id, index) => {
    if (relevant.has(id)) dcg += 1 / Math.log2(index + 2);
  });
  let ideal = 0;
  for (let index = 0; index < Math.min(k, relevant.size); index++) ideal += 1 / Math.log2(index + 2);
  return ideal === 0 ? 0 : dcg / ideal;
}

/** Baseline: the pool in the order TMDB's /similar returned it; pool members /similar didn't return go last. */
export function rankBySimilarOrder(similar: TmdbMovie[], pool: TmdbMovie[]): number[] {
  const position = new Map<number, number>();
  similar.forEach((movie, index) => {
    if (!position.has(movie.id)) position.set(movie.id, index);
  });
  return pool
    .map((movie, index) => ({ id: movie.id, key: position.get(movie.id) ?? similar.length + index }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.id);
}

/** Baseline: genre-id Jaccard with the seed only; ties broken by Bayesian-adjusted rating, then id. */
export function rankByGenreJaccard(seedGenreIds: number[], pool: TmdbMovie[]): number[] {
  const seed = new Set(seedGenreIds);
  const jaccard = (ids: number[]) => {
    const candidate = new Set(ids);
    if (seed.size === 0 || candidate.size === 0) return 0;
    let shared = 0;
    for (const id of candidate) if (seed.has(id)) shared++;
    return shared / (seed.size + candidate.size - shared);
  };
  const precise = (value: number) => Math.round(value * 1e9);
  return pool
    .map((movie) => ({
      id: movie.id,
      score: jaccard(movie.genre_ids),
      rating: adjustedRating({ voteAverage: movie.vote_average, voteCount: movie.vote_count }),
    }))
    .sort((a, b) => precise(b.score) - precise(a.score) || precise(b.rating) - precise(a.rating) || a.id - b.id)
    .map((entry) => entry.id);
}

export interface SeedData {
  seed: TmdbMovieWithExtras;
  /** /similar pages 1–2, concatenated in order. */
  similar: TmdbMovie[];
  /** /discover in the seed's top genres (same query as production). */
  discover: TmdbMovie[];
  /** /recommendations page 1 — the weak ground truth. Never used to build the pool or features. */
  groundTruth: TmdbMovie[];
  /** Details + credits + keywords for pool candidates, by id (missing = fetch failed). */
  profiles: ReadonlyMap<number, TmdbMovieWithExtras>;
}

export interface SeedResult {
  seedId: number;
  seedTitle: string;
  poolSize: number;
  groundTruthSize: number;
  /** Ground-truth movies present in the pool — the most any re-ranker can find. */
  reachable: number;
  /** Of those, how many TMDB's /similar returned (the rest came only from /discover). */
  reachableViaSimilar: number;
  scores: Record<MethodName, { precision: number; ndcg: number }>;
}

/** Same eligibility rules as the production pool, applied to the ground truth so both sides are comparable. */
function isEligible(movie: TmdbMovie, seedId: number, today: string): boolean {
  return movie.id !== seedId && !movie.adult && Boolean(movie.poster_path) && Boolean(movie.release_date) && movie.release_date <= today;
}

/**
 * Evaluates one seed. The candidate pool is built exactly as in production
 * (lib/candidate-pool.ts) but WITHOUT the /recommendations source, because
 * /recommendations is the ground truth: including it would hand every
 * method the answers. All three methods re-rank the same pool — restricted
 * to candidates whose profile was fetched — so they differ only in
 * ordering. Candidate features come from each candidate's own TMDB
 * details, credits and keywords; nothing derived from the ground-truth
 * list is used.
 */
export function evaluateSeed(data: SeedData, today: string, maxCandidates?: number): SeedResult {
  const seedId = data.seed.id;
  const pool = buildCandidatePool(seedId, [data.similar, data.discover], today, maxCandidates).filter((movie) =>
    data.profiles.has(movie.id)
  );
  const relevant = new Set(data.groundTruth.filter((movie) => isEligible(movie, seedId, today)).map((movie) => movie.id));

  const engineRanking = recommendMovies(
    mapExtrasToProfile(data.seed),
    pool.map((movie) => mapExtrasToProfile(data.profiles.get(movie.id)!)),
    pool.length
  ).map((scored) => scored.movie.id);

  const rankings: Record<MethodName, number[]> = {
    tmdbSimilar: rankBySimilarOrder(data.similar, pool),
    genreJaccard: rankByGenreJaccard(data.seed.genres.map((genre) => genre.id), pool),
    engine: engineRanking,
  };

  const scores = Object.fromEntries(
    METHODS.map((method) => [method, { precision: precisionAtK(rankings[method], relevant), ndcg: ndcgAtK(rankings[method], relevant) }])
  ) as SeedResult["scores"];

  return {
    seedId,
    seedTitle: data.seed.title,
    poolSize: pool.length,
    groundTruthSize: relevant.size,
    reachable: pool.filter((movie) => relevant.has(movie.id)).length,
    reachableViaSimilar: pool.filter((movie) => relevant.has(movie.id) && data.similar.some((s) => s.id === movie.id)).length,
    scores,
  };
}

export interface Summary {
  seeds: number;
  meanPoolSize: number;
  meanGroundTruthSize: number;
  meanReachable: number;
  meanReachableViaSimilar: number;
  /** Upper bound on precision@k for any re-ranker of these pools: mean of min(k, reachable) / k. */
  precisionCeiling: number;
  methods: Record<MethodName, { precision: number; ndcg: number }>;
}

/** Means over seeds that have at least one eligible ground-truth movie. */
export function summarize(results: SeedResult[]): Summary {
  const scored = results.filter((result) => result.groundTruthSize > 0);
  const mean = (values: number[]) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);
  return {
    seeds: scored.length,
    meanPoolSize: mean(scored.map((r) => r.poolSize)),
    meanGroundTruthSize: mean(scored.map((r) => r.groundTruthSize)),
    meanReachable: mean(scored.map((r) => r.reachable)),
    meanReachableViaSimilar: mean(scored.map((r) => r.reachableViaSimilar)),
    precisionCeiling: mean(scored.map((r) => Math.min(EVAL_K, r.reachable) / EVAL_K)),
    methods: Object.fromEntries(
      METHODS.map((method) => [
        method,
        { precision: mean(scored.map((r) => r.scores[method].precision)), ndcg: mean(scored.map((r) => r.scores[method].ndcg)) },
      ])
    ) as Summary["methods"],
  };
}
