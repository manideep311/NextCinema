import type { MovieProfile } from "@/types/movie";

export type StoredMovie = Pick<
  MovieProfile,
  "id" | "title" | "posterPath" | "voteAverage" | "releaseYear"
> & {
  /** Timestamp (ms) — sorts recently-viewed by most-recent-first and
   *  favorites by when they were added. */
  addedAt: number;
};
