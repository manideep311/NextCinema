"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Gift, Search, X, Loader2, Star, ArrowRight, Puzzle } from "lucide-react";
import { GREETING_LINES, THINKING_LINES, randomLine } from "@/lib/assistant-lines";
import { CompactMovieList } from "@/components/features/movies/compact-movie-list";
import type { MovieProfile, RecommendationReason } from "@/types/movie";

type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;
interface RecommendedMovie extends CardMovie {
  /** Null for cold-start (popular) picks — popularity is never shown as a match score. */
  matchScore: number | null;
  reasons: RecommendationReason[];
}

type ActionKind = "recommend" | "trending" | "surprise" | "search";

type Screen =
  | { kind: "idle" }
  | { kind: "loading"; action: ActionKind; label: string }
  | { kind: "recommend"; basedOnTitle: string | null; movie: RecommendedMovie }
  | { kind: "trending"; movies: CardMovie[] }
  | { kind: "surprise"; movie: CardMovie }
  | { kind: "search"; query: string; movies: CardMovie[] }
  | { kind: "error"; action: ActionKind; message: string };

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

interface AssistantPanelProps {
  onClose: () => void;
  onThinkingChange: (isThinking: boolean) => void;
  /** Opens the Poster Puzzle mini-game (rendered by the parent widget, not this panel, so it isn't constrained to the panel's small footprint). */
  onOpenPuzzle: () => void;
}

const GREETING = randomLine(GREETING_LINES);

// "What's trending" results are reused for a few minutes instead of being
// refetched on every click; the server side is cached too (TMDB data cache).
const TRENDING_CLIENT_TTL_MS = 5 * 60_000;
let trendingCache: { movies: CardMovie[]; fetchedAt: number } | null = null;

async function fetchJson(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

async function getTrending(): Promise<CardMovie[]> {
  if (trendingCache && Date.now() - trendingCache.fetchedAt < TRENDING_CLIENT_TTL_MS) return trendingCache.movies;
  const data = await fetchJson("/api/movies/trending");
  trendingCache = { movies: data.movies ?? [], fetchedAt: Date.now() };
  return trendingCache.movies;
}

export function AssistantPanel({ onClose, onThinkingChange, onOpenPuzzle }: AssistantPanelProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "idle" });

  async function runAction(action: ActionKind, query?: string) {
    setScreen({ kind: "loading", action, label: randomLine(THINKING_LINES[action]) });
    onThinkingChange(true);

    try {
      if (action === "recommend") {
        // Only the top pick is shown, so only one is requested (the scoring itself is cached server-side).
        const data = await fetchJson("/api/recommendations/for-you?limit=1");
        const top = data.movies?.[0];
        if (!top) throw new Error("No recommendation available yet.");
        setScreen({ kind: "recommend", basedOnTitle: data.basedOnTitle ?? null, movie: top });
      } else if (action === "trending") {
        setScreen({ kind: "trending", movies: await getTrending() });
      } else if (action === "surprise") {
        // A random pick from a genuine hidden-gem pool (well rated, small audience), picked server-side.
        const data = await fetchJson("/api/movies/surprise");
        if (!data.movie) throw new Error("Nothing to suggest right now.");
        setScreen({ kind: "surprise", movie: data.movie });
      } else if (action === "search" && query) {
        const data = await fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
        setScreen({ kind: "search", query, movies: data.results ?? [] });
      }
    } catch (error) {
      setScreen({
        kind: "error",
        action,
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      onThinkingChange(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.92 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: "bottom right" }}
      className="absolute bottom-full right-0 mb-4 w-[22rem] max-w-[90vw] rounded-xl overflow-hidden glass shadow-2xl pointer-events-auto"
    >
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-serif tracking-wide">BUJJI</span>
          <span className="text-[10px] uppercase tracking-widest text-primary/80">Your Movie Companion</span>
        </div>
        <button onClick={onClose} aria-label="Close Bujji" className="text-muted hover:text-text">
          <X className="size-4" />
        </button>
      </div>

      <div className="relative p-4 max-h-[26rem] overflow-y-auto">
        <AnimatePresence mode="wait">
          {screen.kind === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-muted mb-4">{GREETING}</p>
              <div className="grid grid-cols-1 gap-2">
                <QuickAction icon={Sparkles} label="Recommend something" onClick={() => runAction("recommend")} />
                <QuickAction icon={TrendingUp} label="What's trending" onClick={() => runAction("trending")} />
                <QuickAction icon={Gift} label="Surprise me" onClick={() => runAction("surprise")} />
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Puzzle className="size-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Movie break?</p>
                    <p className="text-xs text-muted mb-2.5">Rebuild a scrambled movie poster.</p>
                    <button
                      onClick={onOpenPuzzle}
                      className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                    >
                      Poster Puzzle
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {screen.kind === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3 text-center"
            >
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-sm text-muted">{screen.label}</p>
            </motion.div>
          )}

          {screen.kind === "recommend" && (
            <motion.div key="recommend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted mb-3">
                {screen.basedOnTitle ? (
                  <>Because you liked <span className="text-text font-medium">{screen.basedOnTitle}</span></>
                ) : (
                  "Mission complete. Here's a strong starting point."
                )}
              </p>
              <SpotlightCard
                movie={screen.movie}
                badge={screen.movie.matchScore !== null ? `${screen.movie.matchScore}% match` : screen.movie.voteAverage.toFixed(1)}
                caption={
                  screen.movie.reasons[0]?.label ??
                  (screen.movie.matchScore !== null
                    ? `Similarity to your latest favorite: ${screen.movie.matchScore}%.`
                    : "Popular right now — favorite a movie to get personalized picks.")
                }
              />
              <BackButton onClick={() => setScreen({ kind: "idle" })} />
            </motion.div>
          )}

          {screen.kind === "surprise" && (
            <motion.div key="surprise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted mb-3">I&apos;ve found a hidden gem you might love.</p>
              <SpotlightCard
                movie={screen.movie}
                badge={screen.movie.voteAverage.toFixed(1)}
                caption="Highly rated on TMDB, but seen by relatively few people."
              />
              <BackButton onClick={() => setScreen({ kind: "idle" })} />
            </motion.div>
          )}

          {screen.kind === "trending" && (
            <motion.div key="trending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted mb-3">Trending this week:</p>
              <CompactMovieList movies={screen.movies} />
              <BackButton onClick={() => setScreen({ kind: "idle" })} />
            </motion.div>
          )}

          {screen.kind === "search" && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted mb-3">
                Results for &ldquo;{screen.query}&rdquo;{screen.movies.length === 0 && " — nothing found"}
              </p>
              {screen.movies.length > 0 && <CompactMovieList movies={screen.movies.slice(0, 6)} />}
              <BackButton onClick={() => setScreen({ kind: "idle" })} />
            </motion.div>
          )}

          {screen.kind === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-red-400 mb-3">{screen.message}</p>
              <BackButton onClick={() => setScreen({ kind: "idle" })} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SearchBar onSubmit={(query) => runAction("search", query)} />
    </motion.div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm text-left bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-colors"
    >
      <Icon className="size-4 text-primary shrink-0" strokeWidth={1.75} />
      {label}
      <ArrowRight className="size-3.5 text-muted ml-auto shrink-0" />
    </button>
  );
}

function SpotlightCard({
  movie,
  badge,
  caption,
}: {
  movie: CardMovie;
  badge: string;
  caption: string;
}) {
  return (
    <Link
      href={`/dashboard/movie/${movie.id}`}
      className="flex gap-3 rounded-lg bg-white/5 border border-white/10 p-3 hover:border-primary/40 transition-colors"
    >
      <div className="relative w-16 aspect-[2/3] rounded-md overflow-hidden shrink-0 bg-surface">
        {movie.posterPath ? (
          <Image src={`${IMAGE_BASE_URL}/w185${movie.posterPath}`} alt={movie.title} fill className="object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{movie.title}</h4>
          <span className="flex items-center gap-1 text-xs text-primary shrink-0">
            <Star className="size-3 fill-current" /> {badge}
          </span>
        </div>
        <p className="text-xs text-muted leading-snug line-clamp-3">{caption}</p>
      </div>
    </Link>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-4 text-xs text-muted hover:text-text transition-colors">
      ← Ask something else
    </button>
  );
}

function SearchBar({ onSubmit }: { onSubmit: (query: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim().length > 1) onSubmit(value.trim());
      }}
      className="relative border-t border-white/[0.06] p-3 flex items-center gap-2"
    >
      <Search className="size-4 text-muted shrink-0" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search a title…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </form>
  );
}
