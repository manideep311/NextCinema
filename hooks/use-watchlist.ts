"use client";

import { useCallback } from "react";
import { useLibrary } from "@/components/providers/library-provider";
import type { StoredMovie } from "@/types/storage";

/**
 * Watchlist — account-only. A thin view over the shared LibraryProvider
 * store (see useFavorites for why). `WatchlistButton` redirects guests to
 * /login before `toggleWatchlist` is ever called.
 */
export function useWatchlist() {
  const { watchlist, isHydrated, has, isPending, toggle } = useLibrary();

  const isInWatchlist = useCallback((movieId: number) => has("watchlist", movieId), [has]);
  const isWatchlistPending = useCallback((movieId: number) => isPending("watchlist", movieId), [isPending]);
  const toggleWatchlist = useCallback((movie: Omit<StoredMovie, "addedAt">) => toggle("watchlist", movie), [toggle]);

  return { watchlist, isInWatchlist, toggleWatchlist, isHydrated, isWatchlistPending };
}
