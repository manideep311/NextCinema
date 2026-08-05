"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Loader2 } from "lucide-react";
import { INDUSTRIES, type IndustryId } from "@/lib/industries";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import type { MovieProfile } from "@/types/movie";

type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;
interface TabState {
  movies: CardMovie[];
  page: number;
  hasMore: boolean;
}

/** Tabbed Tollywood/Bollywood/Kollywood/Mollywood/Hollywood/Other browser — each tab's results (and page position) are cached independently, so switching back and forth never re-fetches or loses your "load more" progress. */
export function CategoryTabs() {
  const [active, setActive] = useState<IndustryId>("tollywood");
  const [tabs, setTabs] = useState<Partial<Record<IndustryId, TabState>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (tabs[active]) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchPage(active, 1)
      .then((result) => {
        if (cancelled) return;
        setTabs((current) => ({ ...current, [active]: result }));
      })
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function loadMore() {
    const current = tabs[active];
    if (!current || !current.hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const next = await fetchPage(active, current.page + 1);
      setTabs((prev) => ({
        ...prev,
        [active]: { movies: [...current.movies, ...next.movies], page: next.page, hasMore: next.hasMore },
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }

  const state = tabs[active];

  return (
    <div>
      <div role="tablist" aria-label="Browse by industry" className="flex flex-wrap gap-2 mb-8">
        {INDUSTRIES.map((industry) => {
          const isActive = active === industry.id;
          return (
            <button
              key={industry.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(industry.id)}
              className="relative px-4 py-2 rounded-xl text-sm transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="category-tab-bg"
                  className="absolute inset-0 bg-primary/15 border border-primary/40 rounded-xl"
                  transition={{ duration: 0.25 }}
                />
              )}
              <span className={`relative z-10 font-medium ${isActive ? "text-text" : "text-muted"}`}>
                {industry.label}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <MovieGridSkeleton />
      ) : !state || state.movies.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing found"
          description="Couldn't load this category right now — try another tab."
        />
      ) : (
        <div role="tabpanel">
          <MovieGrid movies={state.movies} />

          {state.hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors disabled:opacity-50"
              >
                {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function fetchPage(industry: IndustryId, page: number): Promise<TabState> {
  const res = await fetch(`/api/movies/by-industry?industry=${industry}&page=${page}`);
  const data = await res.json();
  return { movies: data.movies ?? [], page, hasMore: Boolean(data.hasMore) };
}
