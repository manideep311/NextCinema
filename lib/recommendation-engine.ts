import type { MovieProfile, ScoredMovie, RecommendationReason } from "@/types/movie";
import { clamp01 } from "@/lib/similarity";

// Pure, deterministic, explainable recommendation scoring. No I/O, no
// TMDB calls, no randomness — the same inputs always produce the same
// ranking, which is what makes it independently testable (tests/) and
// swappable without touching the UI.

/**
 * Signal weights (sum to 1.0). Genre + keyword overlap — the strongest
 * "these are genuinely similar" signals — dominate; rating and popularity
 * are light tie-breakers rather than the main driver.
 */
export const WEIGHTS = {
  genre: 0.35,
  keyword: 0.25,
  cast: 0.15,
  director: 0.1,
  rating: 0.1,
  popularity: 0.05,
} as const;

export type SignalName = keyof typeof WEIGHTS;

/** Popularity is unbounded on TMDB (0–1000+), so it's capped before scoring. */
const POPULARITY_CAP = 100;

export interface ScoreBreakdown {
  /** Per-signal similarity in [0, 1]. */
  signals: Record<SignalName, number>;
  /** Weighted sum over *all* signals — the original, un-normalized score in [0, 1]. */
  raw: number;
  /** Sum of weights for signals the base movie actually has data for. */
  applicableWeight: number;
}

interface PreparedBase {
  profile: MovieProfile;
  genreIds: Set<number>;
  keywords: Set<string>;
  cast: Set<string>;
  director: string | null;
  applicableWeight: number;
}

function lowerSet(values: string[]): Set<string> {
  return new Set(values.map((value) => value.toLowerCase()));
}

/** |A∩B| / |A∪B| without materializing the union: |A∪B| = |A| + |B| − |A∩B|. */
function jaccard<T>(base: Set<T>, candidate: Set<T>): number {
  if (base.size === 0 || candidate.size === 0) return 0;
  let intersection = 0;
  for (const item of candidate) if (base.has(item)) intersection++;
  return intersection / (base.size + candidate.size - intersection);
}

/**
 * Signals the base movie has no data for (no keywords on TMDB, no credited
 * director, ...) can never contribute for *any* candidate. They're excluded
 * from the denominator so the displayed "% Match" is a share of the
 * similarity that was actually achievable for this base movie. Because the
 * denominator is identical for every candidate of a given base, this
 * rescales scores without changing their ranking.
 */
function applicableWeightFor(base: MovieProfile): number {
  let weight = WEIGHTS.rating + WEIGHTS.popularity;
  if (base.genreIds.length > 0) weight += WEIGHTS.genre;
  if (base.keywords.length > 0) weight += WEIGHTS.keyword;
  if (base.castNames.length > 0) weight += WEIGHTS.cast;
  if (base.director) weight += WEIGHTS.director;
  return weight;
}

function prepareBase(base: MovieProfile): PreparedBase {
  return {
    profile: base,
    genreIds: new Set(base.genreIds),
    keywords: lowerSet(base.keywords),
    cast: lowerSet(base.castNames),
    director: base.director,
    applicableWeight: applicableWeightFor(base),
  };
}

/** Actual overlapping items, reported in the base movie's own spelling/order. */
function shared(baseList: string[], candidateSet: Set<string>): string[] {
  return baseList.filter((item) => candidateSet.has(item.toLowerCase()));
}

function scoreAgainst(prepared: PreparedBase, candidate: MovieProfile): { scored: ScoredMovie; breakdown: ScoreBreakdown } {
  const candidateKeywords = lowerSet(candidate.keywords);
  const candidateCast = lowerSet(candidate.castNames);

  const signals: Record<SignalName, number> = {
    genre: jaccard(prepared.genreIds, new Set(candidate.genreIds)),
    keyword: jaccard(prepared.keywords, candidateKeywords),
    cast: jaccard(prepared.cast, candidateCast),
    director: prepared.director && candidate.director && prepared.director === candidate.director ? 1 : 0,
    rating: clamp01(candidate.voteAverage / 10),
    popularity: clamp01(candidate.popularity / POPULARITY_CAP),
  };

  let raw = 0;
  for (const name of Object.keys(WEIGHTS) as SignalName[]) raw += signals[name] * WEIGHTS[name];

  const reasons = buildReasons(prepared, candidate, signals, candidateKeywords, candidateCast);
  const score = Math.round(clamp01(raw / prepared.applicableWeight) * 100);

  return {
    scored: { movie: candidate, score, reasons },
    breakdown: { signals, raw, applicableWeight: prepared.applicableWeight },
  };
}

/**
 * Human-readable "why" reasons built from the actual overlapping data —
 * not the number. Ordered by how compelling each reason tends to be.
 */
function buildReasons(
  prepared: PreparedBase,
  candidate: MovieProfile,
  signals: Record<SignalName, number>,
  candidateKeywords: Set<string>,
  candidateCast: Set<string>
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];
  const base = prepared.profile;

  if (signals.director === 1 && candidate.director) {
    reasons.push({ type: "director", label: `Also directed by ${candidate.director}` });
  }

  if (signals.genre > 0) {
    const genres = shared(base.genreNames, lowerSet(candidate.genreNames));
    if (genres.length > 0) reasons.push({ type: "genre", label: `Shares genres: ${genres.slice(0, 3).join(", ")}` });
  }

  if (signals.cast > 0) {
    const cast = shared(base.castNames, candidateCast);
    if (cast.length > 0) reasons.push({ type: "cast", label: `Features ${cast.slice(0, 2).join(", ")}` });
  }

  if (signals.keyword > 0) {
    const themes = shared(base.keywords, candidateKeywords);
    if (themes.length > 0) reasons.push({ type: "keyword", label: `Similar themes: ${themes.slice(0, 3).join(", ")}` });
  }

  if (candidate.voteAverage >= 7.5) {
    reasons.push({ type: "rating", label: `Highly rated (${candidate.voteAverage.toFixed(1)}/10)` });
  }

  return reasons;
}

/** Scores one candidate against a base movie. */
export function scoreMovie(base: MovieProfile, candidate: MovieProfile): ScoredMovie {
  return scoreAgainst(prepareBase(base), candidate).scored;
}

/** Same as `scoreMovie`, plus the per-signal breakdown — for tests and debugging. */
export function explainScore(base: MovieProfile, candidate: MovieProfile): ScoreBreakdown {
  return scoreAgainst(prepareBase(base), candidate).breakdown;
}

/**
 * Scores and ranks a candidate pool against a base movie, returning the
 * top N. The base is prepared once (not per candidate), duplicate
 * candidates and the base movie itself are dropped, and ties are broken
 * deterministically (raw score, then rating, then TMDB id).
 */
export function recommendMovies(base: MovieProfile, candidates: MovieProfile[], topN = 10): ScoredMovie[] {
  const prepared = prepareBase(base);
  const seen = new Set<number>([base.id]);
  const results: { scored: ScoredMovie; raw: number }[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    const { scored, breakdown } = scoreAgainst(prepared, candidate);
    results.push({ scored, raw: breakdown.raw });
  }

  // Raw scores are compared at 1e-9 precision so floating-point summation
  // order can never decide between two genuinely tied candidates.
  const precise = (raw: number) => Math.round(raw * 1e9);
  results.sort(
    (a, b) =>
      precise(b.raw) - precise(a.raw) ||
      b.scored.movie.voteAverage - a.scored.movie.voteAverage ||
      a.scored.movie.id - b.scored.movie.id
  );

  return results.slice(0, topN).map((result) => result.scored);
}
