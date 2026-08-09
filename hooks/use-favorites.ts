"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { StoredMovie } from "@/types/storage";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Favorites — account-only. `FavoriteButton` redirects signed-out users to
 * /login before this hook's `toggleFavorite` is ever called, so there's no
 * Local Storage fallback here: a guest favorite could never be shown
 * anywhere, since the Favorites page/section only render when signed in.
 */
export function useFavorites() {
  const { user, isLoading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<StoredMovie[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  // Movie ids with a mutation currently in flight — guards against rapid
  // double/triple-clicks firing overlapping add/remove requests for the
  // same movie whose responses could resolve out of order. Kept as a ref
  // (for the synchronous re-click check) mirrored into state (so
  // `isFavoritePending` can drive UI, e.g. disabling the button).
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
      ? fetch("/api/favorites", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => data.favorites ?? [])
      : Promise.resolve([]);

    request
      .then((favs) => {
        if (!cancelled) setFavorites(favs);
      })
      .catch(() => {
        if (!cancelled) setFavorites([]);
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isFavorite = useCallback(
    (movieId: number) => favorites.some((m) => m.id === movieId),
    [favorites]
  );

  const isFavoritePending = useCallback((movieId: number) => pendingIds.has(movieId), [pendingIds]);

  const toggleFavorite = useCallback(
    (movie: Omit<StoredMovie, "addedAt">) => {
      if (!user) return; // defense-in-depth — FavoriteButton already redirects guests before calling this
      if (pendingRef.current.has(movie.id)) return; // a mutation for this movie is already in flight — ignore the extra click rather than racing it

      pendingRef.current.add(movie.id);
      setPendingIds(new Set(pendingRef.current));

      const previous = favorites;
      const exists = favorites.some((m) => m.id === movie.id);
      const next = exists
        ? favorites.filter((m) => m.id !== movie.id)
        : [{ ...movie, addedAt: Date.now() }, ...favorites];

      setFavorites(next);

      const request = exists
        ? fetch("/api/favorites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movieId: movie.id }),
          })
        : fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(movie),
          });

      request
        .catch(() => setFavorites(previous)) // roll back on failure
        .finally(() => {
          pendingRef.current.delete(movie.id);
          setPendingIds(new Set(pendingRef.current));
        });
    },
    [favorites, user]
  );

  return { favorites, isFavorite, toggleFavorite, isHydrated, isFavoritePending };
}
