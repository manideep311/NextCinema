import "server-only";
import { tmdbFetch } from "@/lib/tmdb-client";
import type {
  TmdbMovie,
  TmdbMovieDetails,
  TmdbCredits,
  TmdbVideosResponse,
  TmdbPaginatedResponse,
  TmdbGenre,
  TmdbKeywordsResponse,
} from "@/types/tmdb";

/** Movies trending this week — used on the dashboard/landing page. */
export function getTrendingMovies(page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/trending/movie/week", {
    params: { page: String(page) },
    revalidateSeconds: 3600, // trending shifts slowly enough for 1hr cache
  });
}

/** Full list of official TMDB genres, used for genre filter chips. */
export function getGenres() {
  return tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", {
    revalidateSeconds: 86400, // genres basically never change — cache a full day
  });
}

/** Free-text movie search, paginated. */
export function searchMovies(query: string, page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/search/movie", {
    params: { query, page: String(page) },
    revalidateSeconds: 0, // search results shouldn't be stale-cached
  });
}

/** Full details for a single movie's detail page. */
export function getMovieDetails(movieId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${movieId}`, {
    revalidateSeconds: 3600,
  });
}

/** Cast and crew — powers the "Cast" section on the movie details page. */
export function getMovieCredits(movieId: number) {
  return tmdbFetch<TmdbCredits>(`/movie/${movieId}/credits`, {
    revalidateSeconds: 3600,
  });
}

/** Trailers/clips — filtered client-side for YouTube trailers when used. */
export function getMovieVideos(movieId: number) {
  return tmdbFetch<TmdbVideosResponse>(`/movie/${movieId}/videos`, {
    revalidateSeconds: 3600,
  });
}

/** Keywords — one of the inputs to our similarity-based recommendation score. */
export function getMovieKeywords(movieId: number) {
  return tmdbFetch<TmdbKeywordsResponse>(`/movie/${movieId}/keywords`, {
    revalidateSeconds: 86400,
  });
}

/** TMDB's own "similar movies" — used as a candidate pool before we re-rank with our own scoring. */
export function getSimilarMovies(movieId: number, page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>(
    `/movie/${movieId}/similar`,
    { params: { page: String(page) }, revalidateSeconds: 3600 }
  );
}

/** Currently popular movies — used for the "Trending" dashboard rail as a fallback/companion to trending. */
export function getPopularMovies(page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/movie/popular", {
    params: { page: String(page) },
    revalidateSeconds: 3600,
  });
}