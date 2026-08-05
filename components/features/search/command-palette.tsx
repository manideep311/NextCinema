"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Loader2, X } from "lucide-react";
import { useCommandPalette } from "@/components/providers/command-palette-provider";
import { CompactMovieList } from "@/components/features/movies/compact-movie-list";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import type { MovieProfile } from "@/types/movie";

type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;
type SearchMode = "title" | "mood";

const DEBOUNCE_MS = 300;
const MOOD_EXAMPLES = ["mind-blowing plot twists", "feel-good comedy", "sad romantic drama", "scary horror"];

/**
 * Global ⌘K search overlay — reachable from anywhere in the dashboard via
 * the TopNav search bar or the Ctrl/Cmd+K shortcut (handled by
 * CommandPaletteProvider). Reuses the same mood/genre-aware /api/search
 * endpoint as the standalone /dashboard/search page.
 */
export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardMovie[] | null>(null);
  const [mode, setMode] = useState<SearchMode>("title");
  const [isLoading, setIsLoading] = useState(false);
  const { searches, addSearch } = useRecentSearches();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(null);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setMode(data.mode === "mood" ? "mood" : "title");
        addSearch(query);
      } finally {
        setIsLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-xl rounded-2xl overflow-hidden"
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              boxShadow: "0 0 60px rgba(6, 182, 212, 0.15), 0 24px 80px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="size-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a title, mood, or genre…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              {isLoading && <Loader2 className="size-4 text-accent animate-spin shrink-0" />}
              <button onClick={close} aria-label="Close search" className="text-muted hover:text-text shrink-0">
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[24rem] overflow-y-auto p-3">
              {!query && (
                <>
                  <p className="text-xs text-muted px-1 mb-2">Try a mood or genre</p>
                  <div className="flex flex-wrap gap-1.5 px-1 mb-4">
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
                    <>
                      <p className="text-xs text-muted px-1 mb-2">Recent</p>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {searches.map((s) => (
                          <button
                            key={s}
                            onClick={() => setQuery(s)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {query && results === null && !isLoading && null}

              {results !== null && results.length === 0 && (
                <p className="text-sm text-muted text-center py-8">Nothing matched &ldquo;{query}&rdquo;.</p>
              )}

              {results !== null && results.length > 0 && (
                <div>
                  {mode === "mood" && (
                    <p className="flex items-center gap-1.5 text-xs text-accent px-1 mb-2">
                      <Sparkles className="size-3.5" /> Matched by mood/genre, ranked by rating
                    </p>
                  )}
                  <CompactMovieList movies={results.slice(0, 8)} onNavigate={close} />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
