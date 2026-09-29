"use client";

import { useCallback } from "react";
import { useLibrary } from "@/components/providers/library-provider";
import type { StoredMovie } from "@/types/storage";

/**
 * Favorites — account-only. A thin view over the shared LibraryProvider
 * store: calling this hook never triggers a request of its own, however
 * many components use it. `FavoriteButton` redirects guests to /login
 * before `toggleFavorite` is ever called.
 */
export function useFavorites() {
  const { favorites, isHydrated, has, isPending, toggle } = useLibrary();

  const isFavorite = useCallback((movieId: number) => has("favorites", movieId), [has]);
  const isFavoritePending = useCallback((movieId: number) => isPending("favorites", movieId), [isPending]);
  const toggleFavorite = useCallback((movie: Omit<StoredMovie, "addedAt">) => toggle("favorites", movie), [toggle]);

  return { favorites, isFavorite, toggleFavorite, isHydrated, isFavoritePending };
}
