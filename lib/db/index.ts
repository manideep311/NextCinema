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
import { memoizeConnection, type ConnectionSlot } from "@/lib/db/connection-cache";
import { databaseName } from "@/lib/db/config";

// Next.js dev mode hot-reloads route modules on every save, which would
// otherwise open a fresh MongoClient (and a fresh TCP connection) each
// time. Keeping the connection slot on `global` survives module reloads
// in dev; in production each server instance just gets its own
// module-level slot. Either way a failed connect is not cached.
const moduleSlot: ConnectionSlot<MongoClient> = {};

declare global {
  var _mongoClientSlot: ConnectionSlot<MongoClient> | undefined;
}

function connectClient(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri);
  return client.connect().catch(async (error: unknown) => {
    await client.close().catch(() => {});
    throw error;
  });
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add a MongoDB connection string to .env.local — " +
        "see README.md for setup instructions (MongoDB Atlas has a free tier)."
    );
  }

  const slot = process.env.NODE_ENV === "development" ? (global._mongoClientSlot ??= {}) : moduleSlot;
  return memoizeConnection(slot, () => connectClient(uri));
}

/** The MongoDB database handle — lazily connects on first use. */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(databaseName());
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
