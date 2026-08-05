"use client";

import { useState, useEffect, useCallback } from "react";
import type { StoredMovie } from "@/types/storage";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Watchlist — account-only, same reasoning as useFavorites. No Local
 * Storage fallback: WatchlistButton redirects guests to /login before
 * toggleWatchlist is ever called.
 */
export function useWatchlist() {
  const { user, isLoading: authLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<StoredMovie[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setWatchlist([]);
      setIsHydrated(true);
      return;
    }

    let cancelled = false;
    fetch("/api/watchlist", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => !cancelled && setWatchlist(data.watchlist ?? []))
      .catch(() => !cancelled && setWatchlist([]))
      .finally(() => !cancelled && setIsHydrated(true));

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isInWatchlist = useCallback(
    (movieId: number) => watchlist.some((m) => m.id === movieId),
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    (movie: Omit<StoredMovie, "addedAt">) => {
      if (!user) return; // defense-in-depth — WatchlistButton already redirects guests before calling this

      const exists = watchlist.some((m) => m.id === movie.id);
      const next = exists
        ? watchlist.filter((m) => m.id !== movie.id)
        : [{ ...movie, addedAt: Date.now() }, ...watchlist];

      setWatchlist(next);

      const request = exists
        ? fetch("/api/watchlist", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movieId: movie.id }),
          })
        : fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(movie),
          });
      request.catch(() => setWatchlist(watchlist));
    },
    [watchlist, user]
  );

  return { watchlist, isInWatchlist, toggleWatchlist, isHydrated };
}
