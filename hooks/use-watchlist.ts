"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  // Movie ids with a mutation currently in flight — guards against rapid
  // double/triple-clicks firing overlapping add/remove requests for the
  // same movie whose responses could resolve out of order. Kept as a ref
  // (for the synchronous re-click check) mirrored into state (so
  // `isWatchlistPending` can drive UI, e.g. disabling the button).
  const pendingRef = useRef<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (authLoading) return;

    // Both branches (guest vs signed-in) flow through the same promise
    // pipeline so neither ever sets state synchronously inside the effect
    // body itself — the guest case just resolves instantly instead of
    // making a network request.
    let cancelled = false;
    const request: Promise<StoredMovie[]> = user
      ? fetch("/api/watchlist", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => data.watchlist ?? [])
      : Promise.resolve([]);

    request
      .then((list) => {
        if (!cancelled) setWatchlist(list);
      })
      .catch(() => {
        if (!cancelled) setWatchlist([]);
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isInWatchlist = useCallback(
    (movieId: number) => watchlist.some((m) => m.id === movieId),
    [watchlist]
  );

  const isWatchlistPending = useCallback((movieId: number) => pendingIds.has(movieId), [pendingIds]);

  const toggleWatchlist = useCallback(
    (movie: Omit<StoredMovie, "addedAt">) => {
      if (!user) return; // defense-in-depth — WatchlistButton already redirects guests before calling this
      if (pendingRef.current.has(movie.id)) return; // a mutation for this movie is already in flight — ignore the extra click rather than racing it

      pendingRef.current.add(movie.id);
      setPendingIds(new Set(pendingRef.current));

      const previous = watchlist;
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

      request
        .catch(() => setWatchlist(previous)) // roll back on failure
        .finally(() => {
          pendingRef.current.delete(movie.id);
          setPendingIds(new Set(pendingRef.current));
        });
    },
    [watchlist, user]
  );

  return { watchlist, isInWatchlist, toggleWatchlist, isHydrated, isWatchlistPending };
}
