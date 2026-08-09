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

    // Guest and signed-in both flow through the same promise pipeline —
    // guests just resolve to an empty list instantly instead of hitting
    // the network — so state is only ever set from an async continuation,
    // never synchronously in the effect body.
    let cancelled = false;
    const request: Promise<StoredMovie[]> = user
      ? fetch("/api/history", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => data.history ?? [])
      : Promise.resolve([]);

    request
      .then((history) => {
        if (!cancelled) setRecentlyViewed(history);
      })
      .catch(() => {
        if (!cancelled) setRecentlyViewed([]);
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

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
