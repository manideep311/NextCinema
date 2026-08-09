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
  TmdbWatchProvidersResponse,
} from "@/types/tmdb";

/** Movies trending this week — used on the dashboard/landing page. */
export function getTrendingMovies(page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/trending/movie/week", {
    params: { page: String(page) },
    revalidateSeconds: 3600, // trending shifts slowly enough for 1hr cache
  });
}
export interface TmdbMovieWithExtras extends TmdbMovieDetails {
  credits: TmdbCredits;
  keywords: TmdbKeywordsResponse;
}

/**
 * Fetches details + credits + keywords in a single request via TMDB's
 * append_to_response. This is what powers MovieProfile construction —
 * both for a movie's own detail page and for building recommendation
 * candidates — without N+1 separate calls per movie.
 */
export function getMovieWithExtras(movieId: number) {
  return tmdbFetch<TmdbMovieWithExtras>(`/movie/${movieId}`, {
    params: { append_to_response: "credits,keywords" },
    revalidateSeconds: 3600,
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

/**
 * Same underlying endpoint as `searchMovies`, but cached for a month —
 * used to resolve Movie Journeys' static title/year definitions
 * (lib/journeys/definitions.ts) to real TMDB movies. Unlike a live search
 * box, a journey entry's identity never changes day to day, so there's no
 * reason to pay TMDB's rate limit on every request.
 */
export function searchMovieForResolution(query: string) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/search/movie", {
    params: { query },
    revalidateSeconds: 2592000, // 30 days
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

/** TMDB's own top-rated list — powers the dashboard's "Highly Rated" rail. */
export function getTopRatedMovies(page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/movie/top_rated", {
    params: { page: String(page) },
    revalidateSeconds: 86400,
  });
}

/** Not-yet-released movies — powers the dashboard's "Upcoming" rail. */
export function getUpcomingMovies(page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/movie/upcoming", {
    params: { page: String(page) },
    revalidateSeconds: 3600,
  });
}

/**
 * Movies by original language, sorted by popularity — powers the
 * "Categories" page (Tollywood/Bollywood/Kollywood/Mollywood are Telugu/Hindi/Tamil/Malayalam
 * cinema respectively). TMDB has no "industry" field, so language is the
 * closest reliable proxy it exposes.
 */
export function getMoviesByLanguage(languageCode: string, page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", {
    params: {
      with_original_language: languageCode,
      sort_by: "popularity.desc",
      page: String(page),
    },
    revalidateSeconds: 3600,
  });
}

/**
 * Same discover endpoint as `getMoviesByLanguage`, sorted by rating instead
 * of popularity, with a vote-count floor so a handful of 9/10s from a
 * barely-seen title can't outrank movies with real consensus behind them.
 * Powers the Overview's Top Rated / Hidden Gems / Under the Radar
 * industry collections (see services/discovery.ts) — never a second,
 * duplicate trending/popular system.
 */
export function getTopRatedByLanguage(languageCode: string, page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", {
    params: {
      with_original_language: languageCode,
      sort_by: "vote_average.desc",
      "vote_count.gte": "100",
      page: String(page),
    },
    revalidateSeconds: 3600,
  });
}

/**
 * Recently released movies for a given language, newest first — bounded to
 * `primary_release_date.lte` today so a not-yet-released title (TMDB
 * sometimes has future dates queued) never shows up as a "new release".
 * Powers the Overview's New Releases industry collection.
 */
export function getNewReleasesByLanguage(languageCode: string, page = 1) {
  const today = new Date().toISOString().slice(0, 10);
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", {
    params: {
      with_original_language: languageCode,
      sort_by: "primary_release_date.desc",
      "primary_release_date.lte": today,
      "vote_count.gte": "5",
      page: String(page),
    },
    revalidateSeconds: 3600,
  });
}

/**
 * Movies matching any of the given genre IDs (OR, not AND — pipe-joined
 * per TMDB's discover syntax), sorted by rating among well-voted movies.
 * Powers mood/genre search (see lib/mood-lexicon.ts) — not cached long,
 * since it's driven by free-text search input rather than a fixed rail.
 */
export function getMoviesByGenres(genreIds: number[], page = 1) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMovie>>("/discover/movie", {
    params: {
      with_genres: genreIds.join("|"),
      sort_by: "vote_average.desc",
      "vote_count.gte": "200", // filters out obscure/low-vote noise so results are actually recognizable
      page: String(page),
    },
    revalidateSeconds: 300,
  });
}

/**
 * Streaming/rent/buy availability by country, powered by TMDB's JustWatch
 * partnership. Cached for a day since availability doesn't change minute
 * to minute — powers the movie detail page's "Where to Watch" section.
 */
export function getWatchProviders(movieId: number) {
  return tmdbFetch<TmdbWatchProvidersResponse>(`/movie/${movieId}/watch/providers`, {
    revalidateSeconds: 86400,
  });
}