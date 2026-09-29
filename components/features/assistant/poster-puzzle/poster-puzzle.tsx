"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { usePosterPuzzle } from "@/components/features/assistant/poster-puzzle/use-poster-puzzle";
import { PuzzleBoard } from "@/components/features/assistant/poster-puzzle/puzzle-board";
import { PuzzleControls } from "@/components/features/assistant/poster-puzzle/puzzle-controls";
import { PuzzleResult } from "@/components/features/assistant/poster-puzzle/puzzle-result";
import { PuzzleSourceSelect } from "@/components/features/assistant/poster-puzzle/puzzle-source-select";

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

interface PosterPuzzleProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Poster Puzzle — a small cinematic mini-game inside the companion.
 * Self-contained: its own fixed-position modal, independent of the small
 * companion panel, so opening it doesn't force the panel itself to grow.
 * All game rules live in usePosterPuzzle; this component is presentation
 * + wiring only.
 */
export function PosterPuzzle({ open, onClose }: PosterPuzzleProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const game = usePosterPuzzle(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const posterUrl = game.movie?.posterPath ? `${IMAGE_BASE_URL}/w500${game.movie.posterPath}` : null;
  const isSolved = game.status === "solved";
  // Collapses "ready" and "playing" into one key so the board/controls
  // never remount between them — only genuinely distinct phases (intro,
  // celebrating, solved, ...) get their own crossfade.
  const phase =
    game.status === "ready" || game.status === "playing" ? "board" : game.status;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/75"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Poster Puzzle"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-sm glass rounded-xl shadow-2xl p-5 pointer-events-auto"
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-1">Poster Puzzle</p>
                {game.status === "intro" && <p className="text-muted text-xs">Take a look…</p>}
                {(game.status === "ready" || game.status === "playing") && (
                  <p className="text-muted text-xs">{game.companionLine}</p>
                )}
              </div>
              <button onClick={onClose} aria-label="Close Poster Puzzle" className="text-muted hover:text-text shrink-0">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4">
              {!isSolved && game.status !== "celebrating" && (
                <PuzzleSourceSelect
                  source={game.source}
                  disabled={game.status === "loading"}
                  onChange={game.changeSource}
                />
              )}

              <AnimatePresence mode="wait" initial={false}>
                {phase === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center justify-center py-16 gap-3 text-muted"
                  >
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm">Picking a poster…</p>
                  </motion.div>
                )}

                {phase === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 gap-2 text-center"
                  >
                    <p className="text-sm text-muted">Couldn&apos;t load a poster right now — try again in a moment.</p>
                  </motion.div>
                )}

                {/* Show the complete poster first — it "becomes" the puzzle
                   a beat later, per the cinematic motion spec, rather than
                   the board just appearing already shuffled. */}
                {phase === "intro" && game.movie && posterUrl && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative aspect-[2/3] w-full max-w-[240px] mx-auto rounded-lg overflow-hidden ring-1 ring-white/[0.06] shadow-lg"
                  >
                    <motion.div
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0"
                    >
                      <Image src={posterUrl} alt={game.movie.title} fill sizes="240px" className="object-cover" unoptimized />
                    </motion.div>
                    {!reducedMotion && (
                      <motion.div
                        aria-hidden="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: 0.35 }}
                        className="absolute inset-0 grid gap-[3px] p-[3px]"
                        style={{ gridTemplateColumns: `repeat(${game.size}, 1fr)` }}
                      >
                        {Array.from({ length: game.size * game.size }).map((_, i) => (
                          <div key={i} className="ring-1 ring-white/20 rounded-[2px]" />
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {phase === "celebrating" && game.movie && posterUrl && (
                  <motion.div key="celebrating" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <PuzzleBoard
                      tiles={game.tiles}
                      size={game.size}
                      posterUrl={posterUrl}
                      disabled
                      reducedMotion={reducedMotion}
                      hint={null}
                      onMove={() => {}}
                    />
                  </motion.div>
                )}

                {phase === "solved" && game.movie && posterUrl && (
                  <motion.div key="solved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <PuzzleResult
                      movie={game.movie}
                      posterUrl={posterUrl}
                      elapsedMs={game.elapsedMs}
                      moves={game.moves}
                      companionLine={game.companionLine}
                      reducedMotion={reducedMotion}
                      onPlayAgain={game.newPuzzle}
                      onClose={onClose}
                    />
                  </motion.div>
                )}

                {phase === "board" && game.movie && posterUrl && (
                  <motion.div
                    key="board"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PuzzleBoard
                      tiles={game.tiles}
                      size={game.size}
                      posterUrl={posterUrl}
                      disabled={false}
                      reducedMotion={reducedMotion}
                      hint={game.hint}
                      onMove={game.move}
                    />
                    <PuzzleControls
                      difficulty={game.difficulty}
                      elapsedMs={game.elapsedMs}
                      moves={game.moves}
                      hintsRemaining={game.hintsRemaining}
                      disabled={false}
                      onChangeDifficulty={game.changeDifficulty}
                      onHint={game.useHint}
                      onRestart={game.restart}
                      onNewPoster={game.newPuzzle}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
