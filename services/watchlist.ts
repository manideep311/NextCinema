import "server-only";
import { ObjectId } from "mongodb";
import { getWatchlistCollection } from "@/lib/db";
import type { WatchlistDoc } from "@/lib/db/schema";
import type { StoredMovie } from "@/types/storage";

function toStoredMovie(doc: WatchlistDoc): StoredMovie {
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
    .find({ userId: new ObjectId(userId) })
    .sort({ addedAt: -1 })
    .toArray();
  return docs.map(toStoredMovie);
}

export async function addToWatchlist(userId: string, movie: Omit<StoredMovie, "addedAt">) {
  const watchlist = await getWatchlistCollection();
  await watchlist.updateOne(
    { userId: new ObjectId(userId), movieId: movie.id },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
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

export async function removeFromWatchlist(userId: string, movieId: number) {
  const watchlist = await getWatchlistCollection();
  await watchlist.deleteOne({ userId: new ObjectId(userId), movieId });
}
