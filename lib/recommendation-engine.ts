import type { MovieProfile, ScoredMovie, RecommendationReason } from "@/types/movie";
import { jaccardSimilarity, jaccardSimilarityNumeric, sharedItems, clamp01 } from "@/lib/similarity";

// Weights sum to 1.0. Tuned so genre + keyword overlap (the strongest
// "these are actually similar movies" signals) dominate, while
// popularity/rating act as light tie-breakers rather than the main driver.
const WEIGHTS = {
  genre: 0.35,
  keyword: 0.25,
  cast: 0.15,
  director: 0.1,
  popularity: 0.05,
  rating: 0.1,
} as const;

/** Popularity is unbounded on TMDB (can be 0–1000+), so we cap it before scoring. */
const POPULARITY_CAP = 100;

/**
 * Scores one candidate movie against a base movie the user liked.
 * Pure function — no I/O, no TMDB calls — so it's trivially testable
 * and swappable later (spec requirement: "architecture should allow
 * replacing the recommendation algorithm later").
 */
export function scoreMovie(base: MovieProfile, candidate: MovieProfile): ScoredMovie {
  const genreScore = jaccardSimilarityNumeric(base.genreIds, candidate.genreIds);
  const keywordScore = jaccardSimilarity(base.keywords, candidate.keywords);
  const castScore = jaccardSimilarity(base.castNames, candidate.castNames);
  const directorScore =
    base.director && candidate.director && base.director === candidate.director ? 1 : 0;
  const popularityScore = clamp01(candidate.popularity / POPULARITY_CAP);
  const ratingScore = clamp01(candidate.voteAverage / 10);

  const weightedTotal =
    genreScore * WEIGHTS.genre +
    keywordScore * WEIGHTS.keyword +
    castScore * WEIGHTS.cast +
    directorScore * WEIGHTS.director +
    popularityScore * WEIGHTS.popularity +
    ratingScore * WEIGHTS.rating;

  return {
    movie: candidate,
    score: Math.round(weightedTotal * 100),
    reasons: buildReasons(base, candidate, { genreScore, keywordScore, castScore, directorScore }),
  };
}

/**
 * Builds human-readable "Why we recommended this" reasons, using the
 * actual overlapping data — not just the numeric score. Ordered roughly
 * by how compelling each reason type tends to be to a user.
 */
function buildReasons(
  base: MovieProfile,
  candidate: MovieProfile,
  scores: { genreScore: number; keywordScore: number; castScore: number; directorScore: number }
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];

  if (scores.directorScore === 1 && candidate.director) {
    reasons.push({ type: "director", label: `Also directed by ${candidate.director}` });
  }

  if (scores.genreScore > 0) {
    const shared = sharedItems(base.genreNames, candidate.genreNames);
    if (shared.length > 0) {
      reasons.push({ type: "genre", label: `Shares genres: ${shared.slice(0, 3).join(", ")}` });
    }
  }

  if (scores.castScore > 0) {
    const shared = sharedItems(base.castNames, candidate.castNames);
    if (shared.length > 0) {
      reasons.push({ type: "cast", label: `Features ${shared.slice(0, 2).join(", ")}` });
    }
  }

  if (scores.keywordScore > 0) {
    const shared = sharedItems(base.keywords, candidate.keywords);
    if (shared.length > 0) {
      reasons.push({ type: "keyword", label: `Similar themes: ${shared.slice(0, 3).join(", ")}` });
    }
  }

  if (candidate.voteAverage >= 7.5) {
    reasons.push({ type: "rating", label: `Highly rated (${candidate.voteAverage.toFixed(1)}/10)` });
  }

  return reasons;
}

/**
 * Scores and ranks a whole candidate pool against a base movie, returning
 * the top N. This is the function pages/components will actually call.
 */
export function recommendMovies(
  base: MovieProfile,
  candidates: MovieProfile[],
  topN = 10
): ScoredMovie[] {
  return candidates
    .filter((c) => c.id !== base.id) // never recommend the movie itself
    .map((candidate) => scoreMovie(base, candidate))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}