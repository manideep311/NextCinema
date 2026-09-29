"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { WatchlistButton } from "@/components/features/movies/watchlist-button";
import { formatElapsed, type PuzzleMovie } from "@/components/features/assistant/poster-puzzle/puzzle-types";

interface PuzzleResultProps {
  movie: PuzzleMovie;
  posterUrl: string;
  elapsedMs: number;
  moves: number;
  companionLine: string;
  reducedMotion: boolean;
  onPlayAgain: () => void;
  onClose: () => void;
}

export function PuzzleResult({
  movie,
  posterUrl,
  elapsedMs,
  moves,
  companionLine,
  reducedMotion,
  onPlayAgain,
  onClose,
}: PuzzleResultProps) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-32 aspect-[2/3] mx-auto rounded-lg overflow-hidden ring-1 ring-white/10 shadow-2xl mb-4"
      >
        <Image src={posterUrl} alt={movie.title} fill sizes="128px" className="object-cover" unoptimized />
      </motion.div>

      <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-1">You got it</p>
      <h3 className="font-serif text-xl mb-1 text-balance">{movie.title}</h3>
      <p className="text-muted text-xs mb-1">
        {formatElapsed(elapsedMs)} · {moves} {moves === 1 ? "move" : "moves"}
      </p>
      <p className="text-muted text-sm mb-5">{companionLine}</p>

      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/movie/${movie.id}`}
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 text-sm font-medium transition-colors"
        >
          View Movie
        </Link>
        <WatchlistButton movie={movie} showLabel className="w-full justify-center" />
        <button
          onClick={onPlayAgain}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 text-muted hover:text-text hover:border-white/20 px-4 py-2.5 text-sm transition-colors"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
          Play Again
        </button>
      </div>
    </motion.div>
  );
}
