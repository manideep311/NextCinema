import "server-only";
import type { ObjectId } from "mongodb";
import type { UserRole } from "@/lib/auth/token";

// Document shapes for every MongoDB collection NextCinema uses. Collection
// names live in ./collections.ts and index definitions in ./indexes.ts.

export { COLLECTIONS } from "./collections";
export type { UserRole };

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
}

// Favorites, watchlist, history, and watched all store the same small
// denormalized "movie snapshot" (title/poster/rating/year) so dashboard
// lists render without a TMDB round-trip per movie. The snapshot is always
// resolved server-side from TMDB — never taken from the request body.

interface MovieSnapshotFields {
  movieId: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
}

export interface FavoriteDoc extends MovieSnapshotFields {
  _id: ObjectId;
  userId: ObjectId;
  addedAt: Date;
}

export interface WatchlistDoc extends MovieSnapshotFields {
  _id: ObjectId;
  userId: ObjectId;
  addedAt: Date;
}

export interface WatchHistoryDoc extends MovieSnapshotFields {
  _id: ObjectId;
  userId: ObjectId;
  viewedAt: Date;
}

export interface WatchedDoc extends MovieSnapshotFields {
  _id: ObjectId;
  userId: ObjectId;
  /** The journey the movie was marked from — lets the dashboard feature "your current journey" without a TMDB lookup. */
  journeyId: string | null;
  watchedAt: Date;
}
