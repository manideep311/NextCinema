"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { StoredMovie } from "@/types/storage";

type ListName = "favorites" | "watchlist";

export interface InitialLibrary {
  favorites: StoredMovie[];
  watchlist: StoredMovie[];
}

interface LibraryContextValue {
  favorites: StoredMovie[];
  watchlist: StoredMovie[];
  isHydrated: boolean;
  has: (list: ListName, movieId: number) => boolean;
  isPending: (list: ListName, movieId: number) => boolean;
  toggle: (list: ListName, movie: Omit<StoredMovie, "addedAt">) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const ENDPOINTS: Record<ListName, string> = { favorites: "/api/favorites", watchlist: "/api/watchlist" };

/**
 * One shared, client-side copy of the signed-in user's favorites and
 * watchlist. Every heart/bookmark button, the Favorites and Watchlist
 * pages, and any movie appearing in several rails all read the same
 * state — so a page with 60 movie cards makes zero list requests
 * (previously each card fetched both lists itself), and toggling a movie
 * updates every copy of it on screen at once.
 *
 * `initialLibrary` comes from the root layout (read server-side for the
 * signed-in user); `null` means that read failed or the visitor is a
 * guest, and — for signed-in users only — the lists are fetched once here.
 * The provider is keyed by user id in the layout, so it resets on sign-in/out.
 */
export function LibraryProvider({
  children,
  signedIn,
  initialLibrary,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  initialLibrary: InitialLibrary | null;
}) {
  const [lists, setLists] = useState<InitialLibrary>(initialLibrary ?? { favorites: [], watchlist: [] });
  const [isHydrated, setIsHydrated] = useState(initialLibrary !== null || !signedIn);
  const pendingRef = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set());
  const listsRef = useRef(lists);

  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  useEffect(() => {
    if (!signedIn || initialLibrary !== null) return;
    let cancelled = false;
    Promise.all([
      fetch(ENDPOINTS.favorites, { cache: "no-store" }).then((res) => (res.ok ? res.json() : { favorites: [] })),
      fetch(ENDPOINTS.watchlist, { cache: "no-store" }).then((res) => (res.ok ? res.json() : { watchlist: [] })),
    ])
      .then(([favorites, watchlist]) => {
        if (!cancelled) setLists({ favorites: favorites.favorites ?? [], watchlist: watchlist.watchlist ?? [] });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, initialLibrary]);

  const has = useCallback((list: ListName, movieId: number) => lists[list].some((movie) => movie.id === movieId), [lists]);

  const isPending = useCallback((list: ListName, movieId: number) => pendingKeys.has(`${list}:${movieId}`), [pendingKeys]);

  const toggle = useCallback((list: ListName, movie: Omit<StoredMovie, "addedAt">) => {
    const key = `${list}:${movie.id}`;
    // A request for this movie is already in flight — ignore the extra click instead of racing it.
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    setPendingKeys(new Set(pendingRef.current));

    // Functional updates + per-movie rollback, so concurrent toggles of
    // *different* movies never overwrite each other.
    const existing = listsRef.current[list].find((entry) => entry.id === movie.id) ?? null;
    const exists = existing !== null;
    const withoutMovie = (entries: StoredMovie[]) => entries.filter((entry) => entry.id !== movie.id);
    setLists((current) => ({
      ...current,
      [list]: exists ? withoutMovie(current[list]) : [{ ...movie, addedAt: Date.now() }, ...withoutMovie(current[list])],
    }));

    fetch(ENDPOINTS[list], {
      method: exists ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: movie.id }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        if (!exists) {
          // Replace the optimistic entry with the server's canonical snapshot.
          const data = await res.json().catch(() => null);
          if (data?.movie) {
            setLists((current) => ({
              ...current,
              [list]: current[list].map((entry) => (entry.id === movie.id ? { ...data.movie, addedAt: entry.addedAt } : entry)),
            }));
          }
        }
      })
      .catch(() => {
        // Roll back this movie only, on any failure — network error *or* a non-2xx response.
        setLists((current) => ({
          ...current,
          [list]: existing
            ? [...withoutMovie(current[list]), existing].sort((a, b) => b.addedAt - a.addedAt)
            : withoutMovie(current[list]),
        }));
      })
      .finally(() => {
        pendingRef.current.delete(key);
        setPendingKeys(new Set(pendingRef.current));
      });
  }, []);

  const value = useMemo(
    () => ({ favorites: lists.favorites, watchlist: lists.watchlist, isHydrated, has, isPending, toggle }),
    [lists, isHydrated, has, isPending, toggle]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within a LibraryProvider");
  return ctx;
}
