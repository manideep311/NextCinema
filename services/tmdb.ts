import "server-only";
import { tmdbFetch } from "@/lib/tmdb-client";
import type {
  TmdbMovie,
  TmdbMovieDetails,
  TmdbCredits,
  TmdbVideosResponse,
  TmdbPaginatedResponse,
  TmdbKeyword,
  TmdbKeywordsResponse,
  TmdbWatchProvidersResponse,
  TmdbCollection,
  TmdbPerson,
  TmdbPersonMovieCredits,
} from "@/types/tmdb";

// PUBLIC MOVIE DATA ONLY. Everything in this file is identical for every
// visitor, so it is safe to share through Next's Data Cache. Nothing
// user-specific (favorites, history, sessions) ever passes through here.

/** Cache lifetimes (seconds), by how quickly each kind of TMDB data actually changes. */
export const TMDB_CACHE = {
  /** Trending/popular rankings shift through the day. */
  trending: 60 * 60,
  /** Discover/list queries (industry rails, genre and journey pools). */
  lists: 60 * 60,
  /** Per-movie metadata (details, credits, keywords, videos, providers) rarely changes. */
  movie: 60 * 60 * 24,
  /** Free-text title search — public data, but short-lived so new releases show up quickly. */
  search: 60 * 10,
  /** Name → id resolution (collections, keywords, people, journey titles) and filmographies. */
  resolution: 60 * 60 * 24 * 7,
} as const;

/** Movies trending this week (landing hero, auth backdrops, Trending page, assistant). */
export function getTrendingMovies(page = 1, window: "day" | "week" = "week") {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>(`/trending/movie/${window}`, {
    params: { page: String(page) },
    revalidateSeconds: TMDB_CACHE.trending,
  });
}

export interface TmdbMovieWithExtras extends TmdbMovieDetails {
  credits: TmdbCredits;
  keywords: TmdbKeywordsResponse;
}

/**
 * Details + credits + keywords in a single request (append_to_response).
 * Powers MovieProfile construction for a movie's own page and for every
 * recommendation candidate — one cached response per movie, reused by both.
 */
export function getMovieWithExtras(movieId: number) {
  return tmdbFetch<TmdbMovieWithExtras>(`/movie/${movieId}`, {
    params: { append_to_response: "credits,keywords" },
    revalidateSeconds: TMDB_CACHE.movie,
  });
}

/** Lean details (runtime, tagline, collection) — journeys and write-time snapshots. */
export function getMovieDetails(movieId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${movieId}`, {
    revalidateSeconds: TMDB_CACHE.movie,
  });
}

/** Free-text movie title search. */
export function searchMovies(query: string, page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/search/movie", {
    params: { query, page: String(page), include_adult: "false" },
    revalidateSeconds: TMDB_CACHE.search,
  });
}

/**
 * Same endpoint as `searchMovies`, cached for a week — resolves curated
 * journey titles to TMDB movies. A journey entry's identity doesn't change
 * day to day, so there's no reason to spend TMDB's rate limit on it per request.
 */
export function searchMovieForResolution(query: string) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/search/movie", {
    params: { query, include_adult: "false" },
    revalidateSeconds: TMDB_CACHE.resolution,
  });
}

/** Trailers/clips — filtered for YouTube trailers when used. */
export function getMovieVideos(movieId: number) {
  return tmdbFetch<TmdbVideosResponse>(`/movie/${movieId}/videos`, {
    revalidateSeconds: TMDB_CACHE.movie,
  });
}

/** TMDB's own "similar movies" — the candidate pool we re-rank with our own scoring. */
export function getSimilarMovies(movieId: number, page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>(`/movie/${movieId}/similar`, {
    params: { page: String(page) },
    revalidateSeconds: TMDB_CACHE.movie,
  });
}

/** Currently popular movies — For You cold-start fallback and the "Other" industry pool. */
export function getPopularMovies(page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/movie/popular", {
    params: { page: String(page) },
    revalidateSeconds: TMDB_CACHE.trending,
  });
}

/** Parameters accepted by our discover wrapper — a typed subset of TMDB's /discover/movie. */
export interface DiscoverParams {
  with_genres?: string;
  without_genres?: string;
  with_keywords?: string;
  with_original_language?: string;
  with_origin_country?: string;
  with_cast?: string;
  with_crew?: string;
  "primary_release_date.gte"?: string;
  "primary_release_date.lte"?: string;
  "vote_count.gte"?: string;
  "vote_count.lte"?: string;
  "vote_average.gte"?: string;
  "with_runtime.gte"?: string;
  "with_runtime.lte"?: string;
  sort_by?: string;
  page?: string;
}

/** Generic, cached /discover/movie. Adult titles are always excluded. */
export function discoverMovies(params: DiscoverParams, revalidateSeconds: number = TMDB_CACHE.lists) {
  const cleaned: Record<string, string> = { include_adult: "false" };
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") cleaned[key] = value;
  }
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", {
    params: cleaned,
    revalidateSeconds,
  });
}

/** Movies by original language, most popular first (Categories page, Overview rails, "Other"). */
export function getMoviesByLanguage(languageCode: string, page = 1) {
  return discoverMovies({ with_original_language: languageCode, sort_by: "popularity.desc", page: String(page) });
}

/**
 * Same discover endpoint sorted by rating, with a vote floor so a handful
 * of 9/10s from a barely-seen title can't outrank real consensus. Powers
 * the Overview's Top Rated / Hidden Gems / Under the Radar collections.
 */
export function getTopRatedByLanguage(languageCode: string, page = 1) {
  return discoverMovies({
    with_original_language: languageCode,
    sort_by: "vote_average.desc",
    "vote_count.gte": "100",
    page: String(page),
  });
}

/** Recently released movies for a language, newest first — bounded to today so unreleased titles never appear. */
export function getNewReleasesByLanguage(languageCode: string, page = 1) {
  const today = new Date().toISOString().slice(0, 10);
  return discoverMovies({
    with_original_language: languageCode,
    sort_by: "primary_release_date.desc",
    "primary_release_date.lte": today,
    "vote_count.gte": "5",
    page: String(page),
  });
}

/** Streaming/rent/buy availability by country (TMDB × JustWatch). */
export function getWatchProviders(movieId: number) {
  return tmdbFetch<TmdbWatchProvidersResponse>(`/movie/${movieId}/watch/providers`, {
    revalidateSeconds: TMDB_CACHE.movie,
  });
}

export function getCollection(collectionId: number) {
  return tmdbFetch<TmdbCollection>(`/collection/${collectionId}`, {
    revalidateSeconds: TMDB_CACHE.resolution,
  });
}

/** Keyword search by name — resolves theme journeys ("time travel", "heist") to TMDB keyword ids at runtime. */
export function searchKeywords(query: string) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbKeyword>>("/search/keyword", {
    params: { query },
    revalidateSeconds: TMDB_CACHE.resolution,
  });
}

export function searchPeople(query: string) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbPerson>>("/search/person", {
    params: { query, include_adult: "false" },
    revalidateSeconds: TMDB_CACHE.resolution,
  });
}

export function getPersonMovieCredits(personId: number) {
  return tmdbFetch<TmdbPersonMovieCredits>(`/person/${personId}/movie_credits`, {
    revalidateSeconds: TMDB_CACHE.resolution,
  });
}
