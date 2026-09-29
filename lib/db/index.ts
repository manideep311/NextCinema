import "server-only";
import { MongoClient, MongoServerError, ObjectId, type Db, type Collection } from "mongodb";
import {
  COLLECTIONS,
  type UserDoc,
  type FavoriteDoc,
  type WatchlistDoc,
  type WatchHistoryDoc,
  type WatchedDoc,
} from "@/lib/db/schema";

const DEFAULT_DB_NAME = "cinematch";

// Next.js dev mode hot-reloads route modules on every save, which would
// otherwise open a fresh MongoClient (and a fresh TCP connection) each
// time. Caching the connection promise on `global` survives module
// reloads in dev; in production each server instance just gets its own
// singleton via the module-level `clientPromise`.
let clientPromise: Promise<MongoClient> | undefined;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add a MongoDB connection string to .env.local — " +
        "see README.md for setup instructions (MongoDB Atlas has a free tier)."
    );
  }

  if (process.env.NODE_ENV === "development") {
    const cached = global._mongoClientPromise ?? new MongoClient(uri).connect();
    global._mongoClientPromise = cached;
    return cached;
  }

  const promise = clientPromise ?? new MongoClient(uri).connect();
  clientPromise = promise;
  return promise;
}

/** The MongoDB database handle — lazily connects on first use. */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>(COLLECTIONS.users);
}

export async function getFavoritesCollection(): Promise<Collection<FavoriteDoc>> {
  return (await getDb()).collection<FavoriteDoc>(COLLECTIONS.favorites);
}

export async function getWatchlistCollection(): Promise<Collection<WatchlistDoc>> {
  return (await getDb()).collection<WatchlistDoc>(COLLECTIONS.watchlist);
}

export async function getWatchHistoryCollection(): Promise<Collection<WatchHistoryDoc>> {
  return (await getDb()).collection<WatchHistoryDoc>(COLLECTIONS.watchHistory);
}

export async function getWatchedCollection(): Promise<Collection<WatchedDoc>> {
  return (await getDb()).collection<WatchedDoc>(COLLECTIONS.watched);
}

/**
 * Converts a session-derived user id into an ObjectId. The id already
 * passed the session token's shape check; this is the last line of defense
 * so a malformed value can never reach a query as something unexpected.
 */
export function userObjectId(userId: string): ObjectId {
  if (!ObjectId.isValid(userId) || !/^[a-f0-9]{24}$/.test(userId)) {
    throw new Error("Invalid user id");
  }
  return new ObjectId(userId);
}

/** E11000 — a unique index rejected the write (e.g. a concurrent duplicate insert). */
export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}
