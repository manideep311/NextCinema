// Core TMDB API response types.
// Kept separate from our app-level types (in src/types/movie.ts, added later)
// so a TMDB schema change never has to ripple through our UI components.

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface TmdbSpokenLanguage {
  iso_639_1: string;
  english_name: string;
}

export interface TmdbMovieDetails extends Omit<TmdbMovie, "genre_ids"> {
  genres: TmdbGenre[];
  runtime: number | null;
  tagline: string | null;
  status: string;
  budget: number;
  revenue: number;
  production_companies: TmdbProductionCompany[];
  spoken_languages: TmdbSpokenLanguage[];
  original_language: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TmdbVideosResponse {
  results: TmdbVideo[];
}

export interface TmdbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

export interface TmdbKeywordsResponse {
  keywords: TmdbKeyword[];
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

/** Per-region availability — every field is optional since a region may
 *  have no streaming/rent/buy options at all, or be absent from `results`
 *  entirely if TMDB has no data for that country. */
export interface TmdbWatchProviderRegion {
  link: string;
  flatrate?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
}

export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbWatchProviderRegion>;
}