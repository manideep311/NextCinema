import "server-only";
import { ObjectId } from "mongodb";
import { getFavoritesCollection } from "@/lib/db";
import type { FavoriteDoc } from "@/lib/db/schema";
import type { StoredMovie } from "@/types/storage";

function toStoredMovie(doc: FavoriteDoc): StoredMovie {
  return {
    id: doc.movieId,
    title: doc.title,
    posterPath: doc.posterPath,
    voteAverage: doc.voteAverage,
    releaseYear: doc.releaseYear,
    addedAt: doc.addedAt.getTime(),
  };
}

export async function listFavorites(userId: string): Promise<StoredMovie[]> {
  const favorites = await getFavoritesCollection();
  const docs = await favorites
    .find({ userId: new ObjectId(userId) })
    .sort({ addedAt: -1 })
    .toArray();
  return docs.map(toStoredMovie);
}

export async function addFavorite(userId: string, movie: Omit<StoredMovie, "addedAt">) {
  const favorites = await getFavoritesCollection();
  await favorites.updateOne(
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

export async function removeFavorite(userId: string, movieId: number) {
  const favorites = await getFavoritesCollection();
  await favorites.deleteOne({ userId: new ObjectId(userId), movieId });
}
