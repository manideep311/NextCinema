import "server-only";
import { ObjectId } from "mongodb";
import { getWatchHistoryCollection, userObjectId } from "@/lib/db";
import type { WatchHistoryDoc } from "@/lib/db/schema";
import type { StoredMovie } from "@/types/storage";
import type { MovieSnapshot } from "@/services/movie-snapshot";

// "Viewed/opened" history — what Recently Viewed shows. This is NOT
// "watched": opening a movie page never counts toward journey progress
// (see services/watched.ts for the explicit "I watched this" record).

export const RECENTLY_VIEWED_LIMIT = 12;

/** Re-opening the same movie within this window doesn't rewrite its history row. */
const VIEW_WRITE_THROTTLE_MS = 5 * 60_000;

const SNAPSHOT_PROJECTION = {
  _id: 0,
  movieId: 1,
  title: 1,
  posterPath: 1,
  voteAverage: 1,
  releaseYear: 1,
  viewedAt: 1,
} as const;

type HistoryRow = Pick<WatchHistoryDoc, "movieId" | "title" | "posterPath" | "voteAverage" | "releaseYear" | "viewedAt">;

function toStoredMovie(doc: HistoryRow): StoredMovie {
  return {
    id: doc.movieId,
    title: doc.title,
    posterPath: doc.posterPath,
    voteAverage: doc.voteAverage,
    releaseYear: doc.releaseYear,
    addedAt: doc.viewedAt.getTime(),
  };
}

export async function listWatchHistory(userId: string, limit: number = RECENTLY_VIEWED_LIMIT): Promise<StoredMovie[]> {
  const history = await getWatchHistoryCollection();
  const docs = await history
    .find({ userId: userObjectId(userId) })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .project<HistoryRow>(SNAPSHOT_PROJECTION)
    .toArray();
  return docs.map(toStoredMovie);
}

export async function countWatchHistory(userId: string): Promise<number> {
  const history = await getWatchHistoryCollection();
  return history.countDocuments({ userId: userObjectId(userId) });
}

/**
 * Records a view. One row per user per movie (unique index); re-viewing
 * bumps `viewedAt` — but only if the previous view is older than the
 * throttle window, so refreshing or bouncing back to a page doesn't issue
 * a write every time.
 */
export async function recordView(userId: string, movie: MovieSnapshot): Promise<void> {
  const history = await getWatchHistoryCollection();
  const owner = userObjectId(userId);
  const now = new Date();

  // Existing row older than the throttle window → move it to the top.
  const bumped = await history.updateOne(
    { userId: owner, movieId: movie.id, viewedAt: { $lt: new Date(now.getTime() - VIEW_WRITE_THROTTLE_MS) } },
    {
      $set: {
        viewedAt: now,
        title: movie.title,
        posterPath: movie.posterPath,
        voteAverage: movie.voteAverage,
        releaseYear: movie.releaseYear,
      },
    }
  );
  if (bumped.matchedCount > 0) return;

  // Either the first view (insert) or a recent re-view ($setOnInsert makes that a no-op).
  await history.updateOne(
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
        viewedAt: now,
      },
    },
    { upsert: true }
  );
}
