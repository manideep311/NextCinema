import "server-only";
import { getMovieDetails, getMovieWithExtras } from "@/services/tmdb";
import { TmdbApiError } from "@/lib/tmdb-client";
import type { StoredMovie } from "@/types/storage";

export type MovieSnapshot = Omit<StoredMovie, "addedAt">;

export class MovieNotFoundError extends Error {
  constructor() {
    super("Movie not found");
    this.name = "MovieNotFoundError";
  }
}

/**
 * Resolves the small denormalized snapshot (title/poster/rating/year) that
 * favorites, watchlist, history, and watched records store — from TMDB,
 * server-side. Write endpoints accept only a movie id, so a client can't
 * plant an arbitrary title or poster path in its own records.
 *
 * `prefer: "extras"` reuses the exact cached request the movie detail page
 * already made (details + credits + keywords), so recording a view from
 * that page costs no additional TMDB call. `"details"` is the lean request
 * the journey pages cache.
 */
export async function resolveMovieSnapshot(
  movieId: number,
  { prefer = "details" }: { prefer?: "details" | "extras" } = {}
): Promise<MovieSnapshot> {
  try {
    const movie = prefer === "extras" ? await getMovieWithExtras(movieId) : await getMovieDetails(movieId);
    if (!movie || movie.adult) throw new MovieNotFoundError();
    return {
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      voteAverage: movie.vote_average,
      releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
    };
  } catch (error) {
    if (error instanceof TmdbApiError && error.status === 404) throw new MovieNotFoundError();
    throw error;
  }
}
