import "server-only";
import { ObjectId } from "mongodb";
import { getWatchHistoryCollection } from "@/lib/db";
import type { WatchHistoryDoc } from "@/lib/db/schema";
import type { StoredMovie } from "@/types/storage";

const MAX_HISTORY_ROWS = 12;

function toStoredMovie(doc: WatchHistoryDoc): StoredMovie {
  return {
    id: doc.movieId,
    title: doc.title,
    posterPath: doc.posterPath,
    voteAverage: doc.voteAverage,
    releaseYear: doc.releaseYear,
    addedAt: doc.viewedAt.getTime(),
  };
}

export async function listWatchHistory(userId: string): Promise<StoredMovie[]> {
  const watchHistory = await getWatchHistoryCollection();
  const docs = await watchHistory
    .find({ userId: new ObjectId(userId) })
    .sort({ viewedAt: -1 })
    .limit(MAX_HISTORY_ROWS)
    .toArray();
  return docs.map(toStoredMovie);
}

/**
 * Which of the given movie ids has this user actually viewed — the
 * "watched" signal Movie Journeys reuses for progress. Deliberately not
 * limited to MAX_HISTORY_ROWS: `listWatchHistory` caps at the 12 most
 * recent movies for the "Continue Watching" rail, but a journey can have
 * up to 23 entries, and an older watch shouldn't silently drop off a
 * journey's progress just because the user viewed other movies since.
 */
export async function listWatchedMovieIds(userId: string, movieIds: number[]): Promise<Set<number>> {
  if (movieIds.length === 0) return new Set();

  const watchHistory = await getWatchHistoryCollection();
  const docs = await watchHistory
    .find({ userId: new ObjectId(userId), movieId: { $in: movieIds } })
    .project<{ movieId: number }>({ movieId: 1 })
    .toArray();
  return new Set(docs.map((d) => d.movieId));
}

/** Upsert: re-viewing a movie just bumps it back to the top instead of duplicating a document. */
export async function recordWatchHistory(userId: string, movie: Omit<StoredMovie, "addedAt">) {
  const watchHistory = await getWatchHistoryCollection();
  await watchHistory.updateOne(
    { userId: new ObjectId(userId), movieId: movie.id },
    {
      $set: { viewedAt: new Date(), title: movie.title, posterPath: movie.posterPath, voteAverage: movie.voteAverage, releaseYear: movie.releaseYear },
      $setOnInsert: { _id: new ObjectId(), userId: new ObjectId(userId), movieId: movie.id },
    },
    { upsert: true }
  );
}
