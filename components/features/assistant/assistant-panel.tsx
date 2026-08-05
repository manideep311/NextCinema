"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Gift, Search, X, Loader2, Star, ArrowRight } from "lucide-react";
import { GREETING_LINES, THINKING_LINES, randomLine } from "@/lib/assistant-lines";
import { CompactMovieList } from "@/components/features/movies/compact-movie-list";
import type { MovieProfile, RecommendationReason } from "@/types/movie";

type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;
interface RecommendedMovie extends CardMovie {
  matchScore: number;
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
}

const GREETING = randomLine(GREETING_LINES);

export function AssistantPanel({ onClose, onThinkingChange }: AssistantPanelProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "idle" });

  async function runAction(action: ActionKind, query?: string) {
    setScreen({ kind: "loading", action, label: randomLine(THINKING_LINES[action]) });
    onThinkingChange(true);

    try {
      if (action === "recommend") {
        const res = await fetch("/api/recommendations/for-you", { cache: "no-store" });
        const data = await res.json();
        const top = data.movies?.[0];
        if (!top) throw new Error("No recommendation available yet.");
        setScreen({ kind: "recommend", basedOnTitle: data.basedOnTitle ?? null, movie: top });
      } else if (action === "trending") {
        const res = await fetch("/api/movies/trending", { cache: "no-store" });
        const data = await res.json();
        setScreen({ kind: "trending", movies: data.movies ?? [] });
      } else if (action === "surprise") {
        const res = await fetch("/api/movies/trending", { cache: "no-store" });
        const data = await res.json();
        const pool: CardMovie[] = data.movies ?? [];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (!pick) throw new Error("Nothing in the catalog right now.");
        setScreen({ kind: "surprise", movie: pick });
      } else if (action === "search" && query) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const data = await res.json();
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
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute bottom-full right-0 mb-4 w-[22rem] max-w-[90vw] rounded-2xl overflow-hidden pointer-events-auto"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(6, 182, 212, 0.35)",
        boxShadow: "0 0 40px rgba(6, 182, 212, 0.15), 0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Animated holographic grid backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6,182,212,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.8) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative flex items-center justify-between px-4 py-3 border-b border-accent/20">
        <div className="flex items-center gap-2">
          <motion.span
            className="size-2 rounded-full bg-accent"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="text-sm font-heading font-semibold">NextCinema Assistant</span>
        </div>
        <button onClick={onClose} aria-label="Close assistant" className="text-muted hover:text-text">
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
              <Loader2 className="size-6 text-accent animate-spin" />
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
                badge={`${screen.movie.matchScore}% match`}
                caption={screen.movie.reasons[0]?.label ?? `Recommendation confidence: ${screen.movie.matchScore}%.`}
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
                caption="Pulled from this week's trending catalog."
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
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-left bg-white/5 border border-white/10 hover:border-accent/40 hover:bg-white/[0.08] transition-colors"
    >
      <Icon className="size-4 text-accent shrink-0" />
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
      className="flex gap-3 rounded-xl bg-white/5 border border-white/10 p-3 hover:border-accent/40 transition-colors"
    >
      <div className="relative w-16 aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-surface">
        {movie.posterPath ? (
          <Image src={`${IMAGE_BASE_URL}/w185${movie.posterPath}`} alt={movie.title} fill className="object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{movie.title}</h4>
          <span className="flex items-center gap-1 text-xs text-accent shrink-0">
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
      className="relative border-t border-accent/20 p-3 flex items-center gap-2"
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
