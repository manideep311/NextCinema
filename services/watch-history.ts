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
