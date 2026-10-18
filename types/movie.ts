// App-level movie types. These are what our UI components consume —
// deliberately simpler than the raw TMDB types (types/tmdb.ts), so a
// TMDB schema quirk never leaks into a component prop.

/** A credited person. Matched by TMDB id, since names aren't unique. */
export interface CreditedPerson {
  id: number;
  name: string;
}

export interface MovieProfile {
  id: number;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
  genreIds: number[];
  genreNames: string[];
  keywords: string[];
  /** Top-billed cast only (first 5), in billing order — enough signal, keeps payloads small. */
  cast: CreditedPerson[];
  /** Every credited director — co-directed films have more than one. */
  directors: CreditedPerson[];
  popularity: number;
  voteAverage: number;
  voteCount: number;
}

export interface RecommendationReason {
  /** Which scoring component produced this reason, for optional UI styling/icons */
  type: "genre" | "keyword" | "cast" | "director" | "rating";
  label: string;
}

/** One signal's part in a match score — what the "Why this?" panel draws. */
export interface SignalExplanation {
  signal: "genre" | "keyword" | "cast" | "director" | "rating" | "popularity";
  /** Similarity for this signal, in [0, 1]. */
  similarity: number;
  /** Nominal weight (lib/recommendation-engine.ts WEIGHTS). */
  weight: number;
  /** False when either movie lacks the data; its weight is then spread over the others. */
  applicable: boolean;
  /** This signal's share of the final score: similarity × weight ÷ total applicable weight. */
  contribution: number;
}

export interface ScoredMovie {
  movie: MovieProfile;
  /** 0–100, higher = more similar to the base movie */
  score: number;
  reasons: RecommendationReason[];
}