// Collection names — a plain module (no "server-only") so the standalone
// `npm run db:indexes` script can import it outside Next.js.

export const COLLECTIONS = {
  users: "users",
  favorites: "favorites",
  watchlist: "watchlist",
  /** "Viewed/opened" — every movie detail page a signed-in user opens. */
  watchHistory: "watch_history",
  /** "Watched/completed" — only movies the user explicitly marked as watched. Drives journey progress. */
  watched: "watched",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
