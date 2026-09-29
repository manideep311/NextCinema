"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search as SearchIcon, X, Clock } from "lucide-react";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import { JourneySearchMatch } from "@/components/features/journeys/journey-search-match";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import type { MovieProfile } from "@/types/movie";
import type { JourneySearchResult } from "@/types/journey";

type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;

interface SearchResult {
  query: string;
  results: CardMovie[];
  /** What the query was understood as (mood, decade, "Similar to …", "Starring …"); null for plain title matches. */
  label: string | null;
  journeys: JourneySearchResult[];
}

const DEBOUNCE_MS = 350;
const MOOD_EXAMPLES = ["mind-blowing plot twists", "feel-good comedy", "sad romantic drama", "scary horror"];

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { searches, addSearch, clearSearches } = useRecentSearches();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Only the latest query may apply its response: a slower earlier
    // request is both aborted and ignored if it still resolves.
    let cancelled = false;
    const controller = new AbortController();
    const trimmed = query.trim();

    // Keep the URL shareable/refreshable without triggering a navigation.
    const url = trimmed ? `?q=${encodeURIComponent(trimmed)}` : window.location.pathname;
    window.history.replaceState(null, "", url);

    if (trimmed.length < 2) {
      queueMicrotask(() => {
        if (cancelled) return;
        setResult(null);
        setIsLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
          const data = res.ok ? await res.json() : { results: [], label: null, journeys: [] };
          if (cancelled) return;
          setResult({ query: trimmed, results: data.results ?? [], label: data.label ?? null, journeys: data.journeys ?? [] });
          if (res.ok) addSearch(trimmed);
        } catch {
          if (!cancelled) setResult({ query: trimmed, results: [], label: null, journeys: [] });
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const results = result?.results ?? null;

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Search</h1>
      <p className="text-muted mb-6">Search by title, or describe a mood or genre — try “feel-good comedy” or “mind-blowing plot twists”.</p>

      <div className="relative max-w-xl mb-3">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted" />
        <input
          autoFocus
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, actors, genres…"
          className="w-full glass rounded-lg pl-11 pr-10 py-3 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-primary/60 transition-shadow"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {!query && (
          <motion.div
            initial={false}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex flex-wrap gap-2 mb-8">
              {MOOD_EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>

            {searches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Recent searches
                  </h2>
                  <button onClick={clearSearches} className="text-xs text-muted hover:text-text">
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searches.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {query.length > 0 && result && <JourneySearchMatch journeys={result.journeys} />}

      {isLoading ? (
        <MovieGridSkeleton />
      ) : results === null ? (
        query.length > 0 ? null : (
          <EmptyState icon={SearchIcon} title="Search for anything" description="Try a title, like “Dune” — or a mood, like “feel-good comedy”." />
        )
      ) : results.length === 0 ? (
        <EmptyState icon={SearchIcon} title="No results" description={`Nothing matched "${query}".`} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {result?.label && <p className="text-xs text-primary mb-4">{result.label}</p>}
          <MovieGrid key={result?.query} movies={results} />
        </motion.div>
      )}
    </div>
  );
}
