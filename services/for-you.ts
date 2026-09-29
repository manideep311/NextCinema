import "server-only";
import { cache } from "react";
import { getLatestFavorite, listFavoriteIds } from "@/services/favorites";
import { listAllWatchedIds } from "@/services/watched";
import { getRecommendationsForMovie, MAX_RECOMMENDATIONS } from "@/services/recommendations";
import { getMovieWithExtras, getPopularMovies } from "@/services/tmdb";
import { findJourneyForMovie } from "@/services/journeys";
import type { RecommendationReason } from "@/types/movie";

export interface ForYouMovie {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  /**
   * Normalized similarity to the seed movie (0–100) — or `null` when there
   * is no seed (cold start). Popularity is never presented as a match score.
   */
  matchScore: number | null;
  reasons: RecommendationReason[];
}

/**
 * `similarity` — real personalization, seeded from the user's latest favorite.
 * `popular`    — cold start (no favorites yet): popular picks with no match score.
 */
export type ForYouResult =
  | {
      basis: "similarity";
      basedOn: { id: number; title: string };
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
      })),
  };
}

async function computeForYou(userId: string, limit: number): Promise<ForYouResult> {
  const [seed, favoriteIds, watchedIds] = await Promise.all([
    getLatestFavorite(userId),
    listFavoriteIds(userId),
    listAllWatchedIds(userId),
  ]);
  if (!seed) return popularFallback(limit);

  // Shared, public, per-movie cache — the expensive part is computed once
  // per seed movie no matter how many surfaces or users ask for it.
  const [recommendations, seedDetails] = await Promise.all([
    getRecommendationsForMovie(seed.id),
    getMovieWithExtras(seed.id).catch(() => null),
  ]);

  // Personal filtering happens here, outside the shared cache: don't
  // recommend what the user already favorited or has marked watched.
  const exclude = new Set([...favoriteIds, ...watchedIds]);
  const movies = recommendations.filter((movie) => !exclude.has(movie.id)).slice(0, limit);

  const journey = await findJourneyForMovie({
    id: seed.id,
    title: seed.title,
    collectionId: seedDetails?.belongs_to_collection?.id ?? null,
    collectionName: seedDetails?.belongs_to_collection?.name ?? null,
    keywords: seedDetails?.keywords.keywords.map((keyword) => keyword.name) ?? [],
  }).catch(() => null);

  return {
    basis: "similarity",
    basedOn: seed,
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
