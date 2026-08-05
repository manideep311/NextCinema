"use client";

import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setFavorites([]);
      setIsHydrated(true);
      return;
    }

    let cancelled = false;
    fetch("/api/favorites", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => !cancelled && setFavorites(data.favorites ?? []))
      .catch(() => !cancelled && setFavorites([]))
      .finally(() => !cancelled && setIsHydrated(true));

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isFavorite = useCallback(
    (movieId: number) => favorites.some((m) => m.id === movieId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (movie: Omit<StoredMovie, "addedAt">) => {
      if (!user) return; // defense-in-depth — FavoriteButton already redirects guests before calling this

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
      request.catch(() => setFavorites(favorites)); // roll back on failure
    },
    [favorites, user]
  );

  return { favorites, isFavorite, toggleFavorite, isHydrated };
}
