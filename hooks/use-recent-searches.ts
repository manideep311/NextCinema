"use client";

import { useCallback, useEffect, useState } from "react";
import { readFromStorage, userScopedKey, writeToStorage } from "@/lib/local-storage";
import { useAuth } from "@/components/providers/auth-provider";

const MAX_SEARCHES = 8;

/**
 * Account-only recent searches, stored in Local Storage under a key scoped
 * to the signed-in user's id — so on a shared browser one account never
 * sees another's searches — and cleared on sign-out (see AuthProvider).
 */
export function useRecentSearches() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    // Local Storage is browser-only, so it's read after hydration (deferred
    // to a microtask to keep the state update out of the effect body).
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSearches(userId ? readFromStorage<string[]>(userScopedKey("recent-searches", userId)) ?? [] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addSearch = useCallback(
    (query: string) => {
      if (!userId) return;
      const trimmed = query.trim().slice(0, 100);
      if (!trimmed) return;
      setSearches((current) => {
        const next = [trimmed, ...current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_SEARCHES);
        writeToStorage(userScopedKey("recent-searches", userId), next);
        return next;
      });
    },
    [userId]
  );

  const clearSearches = useCallback(() => {
    setSearches([]);
    if (userId) writeToStorage(userScopedKey("recent-searches", userId), []);
  }, [userId]);

  return { searches, addSearch, clearSearches };
}
