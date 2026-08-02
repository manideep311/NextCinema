// App-level movie types. These are what our UI components consume —
// deliberately simpler than the raw TMDB types (types/tmdb.ts), so a
// TMDB schema quirk never leaks into a component prop.

export interface MovieProfile {
  id: number;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
  genreIds: number[];
  genreNames: string[];
  keywords: string[];
  /** Top-billed cast only (first ~5), by name — enough signal, keeps payloads small */
  castNames: string[];
  director: string | null;
  popularity: number;
  voteAverage: number;
}

export interface RecommendationReason {
  /** Which scoring component produced this reason, for optional UI styling/icons */
  type: "genre" | "keyword" | "cast" | "director" | "rating";
  label: string;
}

export interface ScoredMovie {
  movie: MovieProfile;
  /** 0–100, higher = more similar to the base movie */
  score: number;
  reasons: RecommendationReason[];
}