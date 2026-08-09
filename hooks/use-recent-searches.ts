"use client";

import { useCallback, useEffect, useState } from "react";
import { readFromStorage, writeToStorage } from "@/lib/local-storage";
import { useAuth } from "@/components/providers/auth-provider";

const KEY = "cinematch:recent-searches";
const MAX_SEARCHES = 8;

/** Account-only: recent searches aren't stored or shown for guests. */
export function useRecentSearches() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    // Local Storage is a browser-only API, so this can't be read during
    // the lazy useState initializer (that also runs on the server, where
    // there's no `window` — reading it there would mean a mismatched
    // first client render instead of a clean post-hydration update).
    // Deferring the read into a microtask keeps it inside the effect
    // (still only ever runs client-side, still reruns whenever `user`
    // changes) while ensuring the actual state update happens from an
    // async continuation rather than synchronously in the effect body.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSearches(user ? readFromStorage<string[]>(KEY) ?? [] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addSearch = useCallback(
    (query: string) => {
      if (!user) return;
      const trimmed = query.trim();
      if (!trimmed) return;
      setSearches((current) => {
        const next = [trimmed, ...current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          MAX_SEARCHES
        );
        writeToStorage(KEY, next);
        return next;
      });
    },
    [user]
  );

  const clearSearches = useCallback(() => {
    setSearches([]);
    writeToStorage(KEY, []);
  }, []);

  return { searches, addSearch, clearSearches };
}
