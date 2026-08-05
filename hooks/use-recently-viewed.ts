"use client";

import { useState, useEffect, useCallback } from "react";
import type { StoredMovie } from "@/types/storage";
import { useAuth } from "@/components/providers/auth-provider";

const MAX_RECENTLY_VIEWED = 12;

/** Account-only: history is stored server-side and only ever fetched for
 *  signed-in users. Guests get an empty, non-persisted list — nothing is
 *  written to Local Storage or the server on their behalf. */
export function useRecentlyViewed() {
  const { user, isLoading: authLoading } = useAuth();
  const [recentlyViewed, setRecentlyViewed] = useState<StoredMovie[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (user) {
      fetch("/api/history", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => !cancelled && setRecentlyViewed(data.history ?? []))
        .catch(() => !cancelled && setRecentlyViewed([]))
        .finally(() => !cancelled && setIsHydrated(true));
    } else {
      setRecentlyViewed([]);
      setIsHydrated(true);
    }

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const addRecentlyViewed = useCallback(
    (movie: Omit<StoredMovie, "addedAt">) => {
      if (!user) return;

      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movie),
      }).catch(() => {});

      setRecentlyViewed((current) => {
        const withoutDuplicate = current.filter((m) => m.id !== movie.id);
        return [{ ...movie, addedAt: Date.now() }, ...withoutDuplicate].slice(0, MAX_RECENTLY_VIEWED);
      });
    },
    [user]
  );

  return { recentlyViewed, addRecentlyViewed, isHydrated, isGuest: !user };
}
