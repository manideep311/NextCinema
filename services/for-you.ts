import "server-only";
import { listFavorites } from "@/services/favorites";
import { getRecommendationsForMovie } from "@/services/recommendations";
import { getPopularMovies } from "@/services/tmdb";
import type { ScoredMovie } from "@/types/movie";

export interface ForYouResult {
  movies: ScoredMovie[];
  /** Title of the favorite this batch was seeded from, or null for the cold-start/popular fallback. */
  basedOnTitle: string | null;
}

/**
 * Personalized picks for the dashboard. Seeded from the user's most
 * recently favorited movie (real personalization) when one exists;
 * falls back to popularity-ranked movies with no match score for
 * signed-out users or anyone with an empty favorites list (cold start).
 */
export async function getForYouRecommendations(userId: string | null, topN = 10): Promise<ForYouResult> {
  if (userId) {
    const favorites = await listFavorites(userId);
    if (favorites.length > 0) {
      const seed = favorites[0];
      const movies = await getRecommendationsForMovie(seed.id, topN);
      return { movies, basedOnTitle: seed.title };
    }
  }

  const popular = await getPopularMovies();
  const movies: ScoredMovie[] = popular.results.slice(0, topN).map((movie) => ({
    movie: {
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
      genreIds: movie.genre_ids,
      genreNames: [],
      keywords: [],
      castNames: [],
      director: null,
      popularity: movie.popularity,
      voteAverage: movie.vote_average,
    },
    score: Math.round(Math.min(99, movie.vote_average * 10)),
    reasons: [{ type: "rating", label: "Popular with other viewers right now" }],
  }));

  return { movies, basedOnTitle: null };
}
