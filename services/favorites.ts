import "server-only";
import { ObjectId } from "mongodb";
import { getFavoritesCollection, userObjectId } from "@/lib/db";
import type { FavoriteDoc } from "@/lib/db/schema";
import type { StoredMovie } from "@/types/storage";
import type { MovieSnapshot } from "@/services/movie-snapshot";

// Every function takes the *session-derived* user id and scopes every
// query by it — there is no code path that reads or writes another user's
// favorites, regardless of what a request body or URL contains.

const SNAPSHOT_PROJECTION = {
  _id: 0,
  movieId: 1,
  title: 1,
  posterPath: 1,
  voteAverage: 1,
  releaseYear: 1,
  addedAt: 1,
} as const;

type FavoriteRow = Pick<FavoriteDoc, "movieId" | "title" | "posterPath" | "voteAverage" | "releaseYear" | "addedAt">;

function toStoredMovie(doc: FavoriteRow): StoredMovie {
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
    .find({ userId: userObjectId(userId) })
    .sort({ addedAt: -1 })
    .project<FavoriteRow>(SNAPSHOT_PROJECTION)
    .toArray();
  return docs.map(toStoredMovie);
}

/** Movie ids only — a covered query on the (userId, movieId) index. */
export async function listFavoriteIds(userId: string): Promise<number[]> {
  const favorites = await getFavoritesCollection();
  const docs = await favorites
    .find({ userId: userObjectId(userId) })
    .project<{ movieId: number }>({ _id: 0, movieId: 1 })
    .toArray();
  return docs.map((doc) => doc.movieId);
}

/** The For You seed — newest favorite only, served by the (userId, addedAt) index. */
export async function getLatestFavorite(userId: string): Promise<{ id: number; title: string } | null> {
  const favorites = await getFavoritesCollection();
  const doc = await favorites.findOne(
    { userId: userObjectId(userId) },
    { sort: { addedAt: -1 }, projection: { _id: 0, movieId: 1, title: 1 } }
  );
  return doc ? { id: doc.movieId, title: doc.title } : null;
}

export async function countFavorites(userId: string): Promise<number> {
  const favorites = await getFavoritesCollection();
  return favorites.countDocuments({ userId: userObjectId(userId) });
}

/** Idempotent: `$setOnInsert` makes re-adding an existing favorite a no-op rather than a rewrite. */
export async function addFavorite(userId: string, movie: MovieSnapshot): Promise<void> {
  const favorites = await getFavoritesCollection();
  const owner = userObjectId(userId);
  await favorites.updateOne(
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

export async function removeFavorite(userId: string, movieId: number): Promise<void> {
  const favorites = await getFavoritesCollection();
  await favorites.deleteOne({ userId: userObjectId(userId), movieId });
}
