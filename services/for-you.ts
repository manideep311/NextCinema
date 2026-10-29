import "server-only";
import { cache } from "react";
import { listFavoriteIds, listRecentFavorites } from "@/services/favorites";
import { listAllWatchedIds } from "@/services/watched";
import { getRecommendationsForMovie, MAX_RECOMMENDATIONS } from "@/services/recommendations";
import { getMovieWithExtras, getPopularMovies } from "@/services/tmdb";
import { findJourneyForMovie } from "@/services/journeys";
import { blendSeedRecommendations, MAX_SEEDS, type Seed } from "@/lib/personalization";
import type { RecommendationReason, SignalExplanation } from "@/types/movie";

export interface ForYouMovie {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  /**
   * Normalized similarity (0–100) to the favorite this pick was matched
   * with — or `null` on cold start. Popularity is never presented as a match score.
   */
  matchScore: number | null;
  reasons: RecommendationReason[];
  /** The favourite this pick was scored against, with the per-signal breakdown — null on cold start. */
  explanation: { comparedWith: string; signals: SignalExplanation[] } | null;
}

/**
 * `similarity` — real personalization, seeded from the user's most recent favorites.
 * `popular`    — cold start (no favorites yet): popular picks with no match score.
 */
export type ForYouResult =
  | {
      basis: "similarity";
      /** The favorites the picks were blended from, newest first. */
      basedOn: Seed[];
      journey: { id: string; shortName: string } | null;
      movies: ForYouMovie[];
    }
  | { basis: "popular"; basedOn: null; journey: null; movies: ForYouMovie[] };

async function popularFallback(limit: number): Promise<ForYouResult> {
  const popular = await getPopularMovies();
  return {
    basis: "popular",
    basedOn: null,
    journey: null,
    movies: popular.results
      .filter((movie) => movie.poster_path)
      .slice(0, limit)
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        voteAverage: movie.vote_average,
        releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
        matchScore: null,
        reasons: [],
        explanation: null,
      })),
  };
}

async function computeForYou(userId: string, limit: number): Promise<ForYouResult> {
  const [seeds, favoriteIds, watchedIds] = await Promise.all([
    listRecentFavorites(userId, MAX_SEEDS),
    listFavoriteIds(userId),
    listAllWatchedIds(userId),
  ]);
  if (seeds.length === 0) return popularFallback(limit);
  const newest = seeds[0];

  // Each seed's list comes from the shared, public, per-movie cache — the
  // expensive scoring is computed once per movie no matter how many users
  // or surfaces ask. A seed whose list fails is skipped, unless it's the only one.
  const [lists, newestDetails] = await Promise.all([
    Promise.allSettled(seeds.map((seed) => getRecommendationsForMovie(seed.id))),
    getMovieWithExtras(newest.id).catch(() => null),
  ]);
  const seedLists = lists.flatMap((result, index) =>
    // recencyIndex is the seed's original position, so a failed list never promotes an older favourite's weight.
    result.status === "fulfilled" ? [{ seed: seeds[index], recencyIndex: index, recommendations: result.value }] : []
  );
  if (seedLists.length === 0) throw new Error("No recommendations available for any favorite.");

  // Personal filtering and blending happen here, outside the shared cache:
  // never recommend what the user already favorited or marked watched.
  const exclude = new Set([...favoriteIds, ...watchedIds]);
  const movies = blendSeedRecommendations(seedLists, exclude, limit).map(({ movie, seed }) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseYear: movie.releaseYear,
    matchScore: movie.matchScore,
    reasons: movie.reasons,
    explanation: { comparedWith: seed.title, signals: movie.explanation },
  }));

  const journey = await findJourneyForMovie({
    id: newest.id,
    title: newest.title,
    collectionId: newestDetails?.belongs_to_collection?.id ?? null,
    collectionName: newestDetails?.belongs_to_collection?.name ?? null,
    keywords: newestDetails?.keywords.keywords.map((keyword) => keyword.name) ?? [],
  }).catch(() => null);

  return {
    basis: "similarity",
    basedOn: seeds,
    journey: journey ? { id: journey.id, shortName: journey.shortName } : null,
    movies,
  };
}

/**
 * Personalized picks for the signed-in user. Wrapped in React `cache`, so
 * a page that renders it more than once in the same request pays once.
 * The result is never stored in a shared cache — only the public
 * per-movie recommendation lists underneath it are.
 */
export const getForYou = cache((userId: string, limit: number = 10): Promise<ForYouResult> =>
  computeForYou(userId, Math.min(Math.max(1, limit), MAX_RECOMMENDATIONS))
);
