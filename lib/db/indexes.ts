import type { IndexDescription } from "mongodb";
import { COLLECTIONS, type CollectionName } from "./collections";

// Every index the app relies on, with the query it serves. Applied by
// `npm run db:indexes` (lib/db/create-indexes.ts). No index exists here
// without a query that uses it.
//
// Index names are left to MongoDB's defaults (e.g. `userId_1_movieId_1`) on
// purpose: databases set up by the earlier version of this script already
// have those names, and re-declaring the same key under a different name
// would make createIndexes fail instead of being a no-op.

export const INDEX_SPECS: Record<CollectionName, IndexDescription[]> = {
  [COLLECTIONS.users]: [
    // Login lookup + one account per email, enforced by the database rather than app code.
    { key: { email: 1 }, unique: true },
  ],
  [COLLECTIONS.favorites]: [
    // One favorite per user per movie; also serves id-only (covered) lookups.
    { key: { userId: 1, movieId: 1 }, unique: true },
    // Favorites page (newest first) and the For You seed (latest favorite, limit 1).
    { key: { userId: 1, addedAt: -1 } },
  ],
  [COLLECTIONS.watchlist]: [
    { key: { userId: 1, movieId: 1 }, unique: true },
    { key: { userId: 1, addedAt: -1 } },
  ],
  [COLLECTIONS.watchHistory]: [
    // One history row per user per movie — re-viewing updates `viewedAt` instead of duplicating.
    { key: { userId: 1, movieId: 1 }, unique: true },
    // Recently Viewed (newest 12).
    { key: { userId: 1, viewedAt: -1 } },
  ],
  [COLLECTIONS.watched]: [
    // One "watched" mark per user per movie; journey progress is a covered `{userId, movieId: {$in}}` query.
    { key: { userId: 1, movieId: 1 }, unique: true },
    // Most recent journey activity, for the dashboard's "Your Next Chapter".
    { key: { userId: 1, watchedAt: -1 } },
  ],
};
