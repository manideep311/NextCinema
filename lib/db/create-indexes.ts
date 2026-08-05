/**
 * One-time (idempotent) index setup — MongoDB has no schema migrations
 * to run, but unique indexes still need to be created explicitly.
 *
 * Usage: npm run db:indexes
 */
// Relative import, not the "@/" alias — this file runs standalone via
// `tsx` (npm run db:indexes), outside Next's webpack path-alias resolution.
import { getUsersCollection, getFavoritesCollection, getWatchlistCollection, getWatchHistoryCollection } from "./index";

async function main() {
  const [users, favorites, watchlist, watchHistory] = await Promise.all([
    getUsersCollection(),
    getFavoritesCollection(),
    getWatchlistCollection(),
    getWatchHistoryCollection(),
  ]);

  await users.createIndex({ email: 1 }, { unique: true });
  await favorites.createIndex({ userId: 1, movieId: 1 }, { unique: true });
  await watchlist.createIndex({ userId: 1, movieId: 1 }, { unique: true });
  await watchHistory.createIndex({ userId: 1, movieId: 1 }, { unique: true });
  // Speeds up "list my favorites, most recent first" style queries.
  await favorites.createIndex({ userId: 1, addedAt: -1 });
  await watchlist.createIndex({ userId: 1, addedAt: -1 });
  await watchHistory.createIndex({ userId: 1, viewedAt: -1 });

  console.log("✓ MongoDB indexes created.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to create indexes:", error);
  process.exit(1);
});
