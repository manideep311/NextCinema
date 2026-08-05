import "server-only";
import type { ObjectId } from "mongodb";

// Document shapes for every MongoDB collection CineMatch AI uses, plus
// the collection name constants — the single source of truth both
// lib/db/index.ts (typed collection getters) and lib/db/create-indexes.ts
// read from.

export const COLLECTIONS = {
  users: "users",
  favorites: "favorites",
  watchlist: "watchlist",
  watchHistory: "watch_history",
} as const;

export type UserRole = "user" | "premium" | "admin";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
}

// Favorites, watchlist, and watch history all store the same
// denormalized "movie snapshot" (title/poster/rating/year) rather than
// re-fetching TMDB on every dashboard load — see the same note that used
// to live on the Postgres/Drizzle version of this file.

export interface FavoriteDoc {
  _id: ObjectId;
  userId: ObjectId;
  movieId: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  addedAt: Date;
}

export interface WatchlistDoc {
  _id: ObjectId;
  userId: ObjectId;
  movieId: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  addedAt: Date;
}

export interface WatchHistoryDoc {
  _id: ObjectId;
  userId: ObjectId;
  movieId: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  viewedAt: Date;
}
