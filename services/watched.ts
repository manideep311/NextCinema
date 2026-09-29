import "server-only";
import { ObjectId } from "mongodb";
import { getWatchedCollection, userObjectId } from "@/lib/db";
import type { MovieSnapshot } from "@/services/movie-snapshot";

// "Watched/completed" — the explicit signal journey progress is built on.
// Deliberately separate from watch_history ("viewed/opened"): browsing a
// movie's page is not the same as having watched it.

/**
 * Marks a movie watched. Idempotent — the unique (userId, movieId) index
 * plus `$setOnInsert` means marking an already-watched movie issues no
 * update at all, so repeated clicks never rewrite the record.
 */
export async function markWatched(userId: string, movie: MovieSnapshot, journeyId: string | null): Promise<void> {
  const watched = await getWatchedCollection();
  const owner = userObjectId(userId);
  await watched.updateOne(
    { userId: owner, movieId: movie.id },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId: owner,
        movieId: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        voteAverage: movie.voteAverage,
        releaseYear: movie.releaseYear,
        journeyId,
        watchedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function unmarkWatched(userId: string, movieId: number): Promise<void> {
  const watched = await getWatchedCollection();
  await watched.deleteOne({ userId: userObjectId(userId), movieId });
}

/**
 * Which of `movieIds` this user has marked watched. Projects only
 * `movieId` (and drops `_id`) so MongoDB answers it straight from the
 * (userId, movieId) index — a covered query, no document fetches.
 */
export async function listWatchedIdsAmong(userId: string, movieIds: number[]): Promise<Set<number>> {
  if (movieIds.length === 0) return new Set();
  const watched = await getWatchedCollection();
  const docs = await watched
    .find({ userId: userObjectId(userId), movieId: { $in: movieIds } })
    .project<{ movieId: number }>({ _id: 0, movieId: 1 })
    .toArray();
  return new Set(docs.map((doc) => doc.movieId));
}

/** Every watched id for this user (small per user) — used to score many journeys with one query. */
export async function listAllWatchedIds(userId: string): Promise<Set<number>> {
  const watched = await getWatchedCollection();
  const docs = await watched
    .find({ userId: userObjectId(userId) })
    .project<{ movieId: number }>({ _id: 0, movieId: 1 })
    .toArray();
  return new Set(docs.map((doc) => doc.movieId));
}

/** The journey the user most recently made progress in, if any. */
export async function getMostRecentJourneyId(userId: string): Promise<string | null> {
  const watched = await getWatchedCollection();
  const doc = await watched.findOne(
    { userId: userObjectId(userId), journeyId: { $type: "string" } },
    { sort: { watchedAt: -1 }, projection: { _id: 0, journeyId: 1 } }
  );
  return doc?.journeyId ?? null;
}
