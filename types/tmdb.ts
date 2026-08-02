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
}

export interface TmdbMovieDetails extends Omit<TmdbMovie, "genre_ids"> {
  genres: TmdbGenre[];
  runtime: number | null;
  tagline: string | null;
  status: string;
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