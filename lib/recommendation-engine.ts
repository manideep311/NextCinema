import type { CreditedPerson, MovieProfile, ScoredMovie, RecommendationReason, SignalExplanation } from "@/types/movie";
import { clamp01 } from "@/lib/similarity";
import { bayesianRating } from "@/lib/rating";

// Pure, deterministic, explainable recommendation scoring. No I/O, no
// TMDB calls, no randomness — the same inputs always produce the same
// ranking, which is what makes it independently testable (tests/) and
// swappable without touching the UI.

/**
 * Signal weights (sum to 1.0). Genre + keyword overlap — the strongest
 * "these are genuinely similar" signals — dominate. Rating and popularity
 * are light signals measured as *closeness to the seed movie*, so a
 * blockbuster suggests blockbusters and a cult favourite suggests cult
 * favourites, instead of everything leaning toward whatever is biggest.
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

const SIGNAL_NAMES = Object.keys(WEIGHTS) as SignalName[];

/**
 * Bayesian prior strength for the rating signal: a movie needs about this
 * many votes before its own average outweighs the global mean (see
 * lib/rating.ts). Replaces a hard minimum-vote cutoff.
 */
export const RATING_PRIOR_VOTES = 100;
/** Gap between Bayesian ratings (points out of 10) at which rating closeness reaches 0. */
export const RATING_GAP_SCALE = 3;
/** Gap in log10(1 + popularity) — orders of magnitude — at which popularity closeness reaches 0. */
export const POPULARITY_GAP_SCALE = 2;

export interface ScoreBreakdown {
  /** Per-signal similarity in [0, 1] (0 for signals that don't apply). */
  signals: Record<SignalName, number>;
  /** Per-signal similarity, weight, applicability and share of the score, in WEIGHTS order. */
  explanation: SignalExplanation[];
  /** Σ similarity × weight over the applicable signals. */
  raw: number;
  /** Σ weight over the applicable signals — the denominator. */
  applicableWeight: number;
  /** raw / applicableWeight, in [0, 1]. The displayed "% Match" is this × 100, rounded. */
  normalized: number;
}

interface PreparedBase {
  profile: MovieProfile;
  genreIds: Set<number>;
  keywords: Set<string>;
  castIds: Set<number>;
  directorIds: Set<number>;
  rating: number;
  logPopularity: number;
}

function lowerSet(values: string[]): Set<string> {
  return new Set(values.map((value) => value.toLowerCase()));
}

function idSet(people: CreditedPerson[]): Set<number> {
  return new Set(people.map((person) => person.id));
}

/** Vote average shrunk toward the global mean by how few votes back it. */
export function adjustedRating(movie: Pick<MovieProfile, "voteAverage" | "voteCount">): number {
  return bayesianRating(movie.voteAverage, movie.voteCount, RATING_PRIOR_VOTES);
}

/** TMDB popularity spans ~0.1 to 1000+, so it's compared on a log scale. */
export function logPopularity(movie: Pick<MovieProfile, "popularity">): number {
  return Math.log10(1 + Math.max(0, movie.popularity));
}

/** 1 when equal, falling linearly to 0 at a gap of `scale`. */
function closeness(a: number, b: number, scale: number): number {
  return clamp01(1 - Math.abs(a - b) / scale);
}

/** |A∩B| / |A∪B| without materializing the union: |A∪B| = |A| + |B| − |A∩B|. */
function jaccard<T>(base: Set<T>, candidate: Set<T>): number {
  if (base.size === 0 || candidate.size === 0) return 0;
  let intersection = 0;
  for (const item of candidate) if (base.has(item)) intersection++;
  return intersection / (base.size + candidate.size - intersection);
}

/**
 * Which signals can be measured for this pair. A signal the *seed* has no
 * data for (no keywords on TMDB, no credited director, ...) can never
 * contribute. Keywords and cast are also skipped when the *candidate* has
 * none: TMDB simply has no data, which says nothing about similarity, so
 * the candidate is judged on the remaining signals instead of being
 * scored 0 on them. Rating and popularity always apply (the Bayesian
 * prior covers movies with no votes).
 */
function applicability(base: MovieProfile, candidate: MovieProfile): Record<SignalName, boolean> {
  return {
    genre: base.genreIds.length > 0,
    keyword: base.keywords.length > 0 && candidate.keywords.length > 0,
    cast: base.cast.length > 0 && candidate.cast.length > 0,
    director: base.directors.length > 0,
    rating: true,
    popularity: true,
  };
}

function prepareBase(base: MovieProfile): PreparedBase {
  return {
    profile: base,
    genreIds: new Set(base.genreIds),
    keywords: lowerSet(base.keywords),
    castIds: idSet(base.cast),
    directorIds: idSet(base.directors),
    rating: adjustedRating(base),
    logPopularity: logPopularity(base),
  };
}

/** Actual overlapping items, reported in the base movie's own spelling/order. */
function shared(baseList: string[], candidateSet: Set<string>): string[] {
  return baseList.filter((item) => candidateSet.has(item.toLowerCase()));
}

/** Overlapping people (matched by TMDB id), named as in the base movie's credits. */
function sharedPeople(basePeople: CreditedPerson[], candidateIds: Set<number>): string[] {
  return basePeople.filter((person) => candidateIds.has(person.id)).map((person) => person.name);
}

function scoreAgainst(prepared: PreparedBase, candidate: MovieProfile): { scored: ScoredMovie; breakdown: ScoreBreakdown } {
  const candidateKeywords = lowerSet(candidate.keywords);
  const candidateCast = idSet(candidate.cast);
  const candidateDirectors = idSet(candidate.directors);
  const applies = applicability(prepared.profile, candidate);

  const similarity: Record<SignalName, number> = {
    genre: jaccard(prepared.genreIds, new Set(candidate.genreIds)),
    keyword: jaccard(prepared.keywords, candidateKeywords),
    cast: jaccard(prepared.castIds, candidateCast),
    // Jaccard over *all* credited directors: 1 for the same director(s), 0.5 when one of two co-directors returns.
    director: jaccard(prepared.directorIds, candidateDirectors),
    rating: closeness(prepared.rating, adjustedRating(candidate), RATING_GAP_SCALE),
    popularity: closeness(prepared.logPopularity, logPopularity(candidate), POPULARITY_GAP_SCALE),
  };

  let raw = 0;
  let applicableWeight = 0;
  const signals = {} as Record<SignalName, number>;
  for (const name of SIGNAL_NAMES) {
    signals[name] = applies[name] ? similarity[name] : 0;
    if (!applies[name]) continue;
    raw += similarity[name] * WEIGHTS[name];
    applicableWeight += WEIGHTS[name];
  }
  // Rating and popularity always apply, so the denominator is never 0.
  const normalized = clamp01(raw / applicableWeight);

  const explanation: SignalExplanation[] = SIGNAL_NAMES.map((name) => ({
    signal: name,
    similarity: signals[name],
    weight: WEIGHTS[name],
    applicable: applies[name],
    contribution: applies[name] ? (signals[name] * WEIGHTS[name]) / applicableWeight : 0,
  }));

  const reasons = buildReasons(prepared, candidate, signals, candidateKeywords, candidateCast, candidateDirectors);

  return {
    scored: { movie: candidate, score: Math.round(normalized * 100), reasons },
    breakdown: { signals, explanation, raw, applicableWeight, normalized },
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
  candidateCast: Set<number>,
  candidateDirectors: Set<number>
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];
  const base = prepared.profile;

  if (signals.director > 0) {
    const directors = sharedPeople(base.directors, candidateDirectors);
    if (directors.length > 0) reasons.push({ type: "director", label: `Also directed by ${directors.join(" & ")}` });
  }

  if (signals.genre > 0) {
    const genres = shared(base.genreNames, lowerSet(candidate.genreNames));
    if (genres.length > 0) reasons.push({ type: "genre", label: `Shares genres: ${genres.slice(0, 3).join(", ")}` });
  }

  if (signals.cast > 0) {
    const cast = sharedPeople(base.cast, candidateCast);
    if (cast.length > 0) reasons.push({ type: "cast", label: `Features ${cast.slice(0, 2).join(", ")}` });
  }

  if (signals.keyword > 0) {
    const themes = shared(base.keywords, candidateKeywords);
    if (themes.length > 0) reasons.push({ type: "keyword", label: `Similar themes: ${themes.slice(0, 3).join(", ")}` });
  }

  // Only when the candidate has enough votes that its raw average (shown) and adjusted rating (scored) agree.
  if (signals.rating >= 0.8 && candidate.voteCount >= RATING_PRIOR_VOTES) {
    reasons.push({
      type: "rating",
      label: `Similarly rated (${candidate.voteAverage.toFixed(1)} vs ${base.voteAverage.toFixed(1)})`,
    });
  }

  return reasons;
}

/** Scores one candidate against a base movie. */
export function scoreMovie(base: MovieProfile, candidate: MovieProfile): ScoredMovie {
  return scoreAgainst(prepareBase(base), candidate).scored;
}

/** Same as `scoreMovie`, but returns the per-signal breakdown behind the number. */
export function explainScore(base: MovieProfile, candidate: MovieProfile): ScoreBreakdown {
  return scoreAgainst(prepareBase(base), candidate).breakdown;
}

/**
 * Scores and ranks a candidate pool against a base movie, returning the
 * top N. The base is prepared once (not per candidate), duplicate
 * candidates and the base movie itself are dropped, and ties are broken
 * deterministically (normalized score, then adjusted rating, then TMDB id).
 * Ranking uses the normalized score because each candidate's denominator
 * depends on which of its signals apply.
 */
export function recommendMovies(base: MovieProfile, candidates: MovieProfile[], topN = 10): ScoredMovie[] {
  const prepared = prepareBase(base);
  const seen = new Set<number>([base.id]);
  const results: { scored: ScoredMovie; normalized: number; rating: number }[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    const { scored, breakdown } = scoreAgainst(prepared, candidate);
    results.push({ scored, normalized: breakdown.normalized, rating: adjustedRating(candidate) });
  }

  // Compared at 1e-9 precision so floating-point summation order can never
  // decide between two genuinely tied candidates.
  const precise = (value: number) => Math.round(value * 1e9);
  results.sort(
    (a, b) =>
      precise(b.normalized) - precise(a.normalized) ||
      precise(b.rating) - precise(a.rating) ||
      a.scored.movie.id - b.scored.movie.id
  );

  return results.slice(0, topN).map((result) => result.scored);
}
