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
    if (!user) {
      setSearches([]);
      return;
    }
    setSearches(readFromStorage<string[]>(KEY) ?? []);
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
