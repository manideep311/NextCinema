import "server-only";
import { ObjectId } from "mongodb";
import { getWatchlistCollection, userObjectId } from "@/lib/db";
import type { WatchlistDoc } from "@/lib/db/schema";
import type { StoredMovie } from "@/types/storage";
import type { MovieSnapshot } from "@/services/movie-snapshot";

// Same ownership model as services/favorites.ts: the user id always comes
// from the verified session and scopes every query.

const SNAPSHOT_PROJECTION = {
  _id: 0,
  movieId: 1,
  title: 1,
  posterPath: 1,
  voteAverage: 1,
  releaseYear: 1,
  addedAt: 1,
} as const;

type WatchlistRow = Pick<WatchlistDoc, "movieId" | "title" | "posterPath" | "voteAverage" | "releaseYear" | "addedAt">;

function toStoredMovie(doc: WatchlistRow): StoredMovie {
  return {
    id: doc.movieId,
    title: doc.title,
    posterPath: doc.posterPath,
    voteAverage: doc.voteAverage,
    releaseYear: doc.releaseYear,
    addedAt: doc.addedAt.getTime(),
  };
}

export async function listWatchlist(userId: string): Promise<StoredMovie[]> {
  const watchlist = await getWatchlistCollection();
  const docs = await watchlist
    .find({ userId: userObjectId(userId) })
    .sort({ addedAt: -1 })
    .project<WatchlistRow>(SNAPSHOT_PROJECTION)
    .toArray();
  return docs.map(toStoredMovie);
}

export async function listWatchlistIds(userId: string): Promise<number[]> {
  const watchlist = await getWatchlistCollection();
  const docs = await watchlist
    .find({ userId: userObjectId(userId) })
    .project<{ movieId: number }>({ _id: 0, movieId: 1 })
    .toArray();
  return docs.map((doc) => doc.movieId);
}

export async function countWatchlist(userId: string): Promise<number> {
  const watchlist = await getWatchlistCollection();
  return watchlist.countDocuments({ userId: userObjectId(userId) });
}

export async function addToWatchlist(userId: string, movie: MovieSnapshot): Promise<void> {
  const watchlist = await getWatchlistCollection();
  const owner = userObjectId(userId);
  await watchlist.updateOne(
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
        addedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function removeFromWatchlist(userId: string, movieId: number): Promise<void> {
  const watchlist = await getWatchlistCollection();
  await watchlist.deleteOne({ userId: userObjectId(userId), movieId });
}
