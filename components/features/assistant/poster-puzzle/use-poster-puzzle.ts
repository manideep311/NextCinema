"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  DIFFICULTY_CONFIG,
  MAX_HINTS,
  buildShuffledTiles,
  dayOfYearSeed,
  getNeighbors,
  isSolved,
  type Difficulty,
  type PuzzleMovie,
  type PuzzleSource,
  type PuzzleStatus,
} from "@/components/features/assistant/poster-puzzle/puzzle-types";
import { recordPuzzleCompletion } from "@/components/features/assistant/poster-puzzle/puzzle-history";

const LONG_SOLVE_MS = 45_000;
const FAST_SOLVE_MS = 20_000;
const NEAR_COMPLETE_RATIO = 0.7;
// Brief "show the whole poster, then it becomes a puzzle" beat before the
// board turns interactive — and a short pause on the final tile before the
// result screen takes over. Skipped/shortened under reduced motion.
const INTRO_MS = 650;
const CELEBRATE_MS = 550;

interface HintState {
  from: number;
  to: number;
}

/**
 * All Poster Puzzle game state and logic, kept separate from presentation.
 * Fetches its own small movie pool (reusing the existing trending API —
 * no new backend), builds a guaranteed-solvable board, and tracks moves/
 * timer/hints/completion. Presentation components just read state and call
 * the returned actions.
 */
export function usePosterPuzzle(isOpen: boolean) {
  const reducedMotion = Boolean(useReducedMotion());
  const [source, setSource] = useState<PuzzleSource>("trending");
  const [pool, setPool] = useState<PuzzleMovie[]>([]);
  const [poolError, setPoolError] = useState(false);
  const [movie, setMovie] = useState<PuzzleMovie | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>("loading");
  const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
  const [hint, setHint] = useState<HintState | null>(null);

  const startRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
      if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);
    },
    []
  );

  // Fetch a small movie pool whenever the game is opened, or the category
  // changes — reuses the exact same endpoints the app already has
  // (assistant's "What's trending" action, and /dashboard/categories'
  // by-industry API), so switching category is just a different fetch, not
  // a new data source.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // Deferred to a microtask so the reset happens from an async
    // continuation rather than synchronously in the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      setStatus("loading");
      setPool([]);
      setMovie(null);
      setPoolError(false);
    });

    const url = source === "trending" ? "/api/movies/trending" : `/api/movies/by-industry?industry=${source}`;

    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const withPosters: PuzzleMovie[] = (data.movies ?? []).filter((m: PuzzleMovie) => m.posterPath);
        if (withPosters.length === 0) {
          setPoolError(true);
          setStatus("error");
          return;
        }
        setPool(withPosters);
      })
      .catch(() => {
        if (!cancelled) {
          setPoolError(true);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, source]);

  const startNew = useCallback(
    (nextMovie: PuzzleMovie, diff: Difficulty) => {
      const { size, shuffle } = DIFFICULTY_CONFIG[diff];
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
      if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);

      setMovie(nextMovie);
      setTiles(buildShuffledTiles(size, shuffle));
      setMoves(0);
      setElapsedMs(0);
      setHintsRemaining(MAX_HINTS);
      setHint(null);
      startRef.current = null;

      if (reducedMotion) {
        setStatus("ready");
      } else {
        // Show the complete poster first, then hand off to the shuffled
        // board — see the "intro" branch in poster-puzzle.tsx.
        setStatus("intro");
        introTimeoutRef.current = setTimeout(() => setStatus("ready"), INTRO_MS);
      }
    },
    [reducedMotion]
  );

  // Once the pool arrives, kick off the first puzzle automatically.
  useEffect(() => {
    if (pool.length === 0 || movie) return;
    let cancelled = false;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // startNew itself sets several pieces of state — deferring the call
    // keeps all of that inside an async continuation rather than running
    // synchronously in the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      startNew(pick, difficulty);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  // Smooth timer tick while actively playing — stops itself the instant
  // status leaves "playing" (solved, or a fresh puzzle reset to "ready").
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      if (startRef.current) setElapsedMs(Date.now() - startRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [status]);

  const move = useCallback(
    (pos: number) => {
      if (status !== "ready" && status !== "playing") return;
      if (!movie) return;
      const currentMovie = movie;

      const size = DIFFICULTY_CONFIG[difficulty].size;
      const blankHome = size * size - 1;
      const blankPos = tiles.indexOf(blankHome);
      if (!getNeighbors(blankPos, size).includes(pos)) return;

      const next = [...tiles];
      [next[pos], next[blankPos]] = [next[blankPos], next[pos]];
      setTiles(next);
      setMoves((m) => m + 1);

      let justStarted = false;
      if (status === "ready") {
        startRef.current = Date.now();
        justStarted = true;
        setStatus("playing");
      }

      if (isSolved(next)) {
        const finalElapsed = justStarted ? 0 : startRef.current ? Date.now() - startRef.current : elapsedMs;
        setElapsedMs(finalElapsed);
        recordPuzzleCompletion({
          movieId: currentMovie.id,
          title: currentMovie.title,
          difficulty,
          timeMs: finalElapsed,
          moves: moves + 1,
          completedAt: Date.now(),
        });

        // A short pause on the finished poster — let the final tile's own
        // layout animation settle — before handing off to the result screen.
        if (reducedMotion) {
          setStatus("solved");
        } else {
          setStatus("celebrating");
          celebrateTimeoutRef.current = setTimeout(() => setStatus("solved"), CELEBRATE_MS);
        }
      }
    },
    [status, movie, tiles, difficulty, moves, elapsedMs, reducedMotion]
  );

  const useHint = useCallback(() => {
    if (hintsRemaining <= 0 || status === "solved" || status === "loading") return;
    const size = DIFFICULTY_CONFIG[difficulty].size;
    const blankHome = size * size - 1;
    const misplaced = tiles
      .map((v, i) => ({ v, i }))
      .filter(({ v, i }) => v !== i && v !== blankHome);
    if (misplaced.length === 0) return;

    const pick = misplaced[Math.floor(Math.random() * misplaced.length)];
    setHint({ from: pick.i, to: pick.v });
    setHintsRemaining((h) => h - 1);

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setHint(null), 1500);
  }, [hintsRemaining, status, tiles, difficulty]);

  const restart = useCallback(() => {
    if (movie) startNew(movie, difficulty);
  }, [movie, difficulty, startNew]);

  const changeDifficulty = useCallback(
    (next: Difficulty) => {
      setDifficulty(next);
      if (movie) startNew(movie, next);
    },
    [movie, startNew]
  );

  const newPuzzle = useCallback(() => {
    if (pool.length === 0) return;
    const candidates = pool.filter((m) => m.id !== movie?.id);
    const list = candidates.length > 0 ? candidates : pool;
    const pick = list[Math.floor(Math.random() * list.length)];
    startNew(pick, difficulty);
  }, [pool, movie, difficulty, startNew]);

  const loadTodaysPoster = useCallback(() => {
    if (pool.length === 0) return;
    const pick = pool[dayOfYearSeed() % pool.length];
    startNew(pick, difficulty);
  }, [pool, difficulty, startNew]);

  // Switches the movie pool to a different category (Trending, or one of
  // the industry/language tabs from /dashboard/categories) — refetches via
  // the effect above and auto-picks a fresh movie from the new pool.
  const changeSource = useCallback((next: PuzzleSource) => {
    setSource(next);
  }, []);

  // Companion's in-game line — short, playful, never a running conversation.
  const size = DIFFICULTY_CONFIG[difficulty].size;
  const blankHome = size * size - 1;
  const correctCount = tiles.filter((v, i) => v === i && v !== blankHome).length;
  const totalPieces = size * size - 1;
  const progressRatio = totalPieces > 0 ? correctCount / totalPieces : 0;
  // "That corner looks suspicious." — a single gentle nudge once a puzzle
  // has been playing a while. Purely derived from elapsedMs (which itself
  // only grows while `status === "playing"` and resets via startNew), so
  // no separate state/effect is needed to track it.
  const longSolveNudge = status === "playing" && elapsedMs >= LONG_SOLVE_MS;

  let companionLine = "Movie break?";
  if (status === "solved") {
    companionLine = elapsedMs > 0 && elapsedMs < FAST_SOLVE_MS ? "Okay, you know your movies." : "Nice one.";
  } else if (status === "playing") {
    companionLine = longSolveNudge
      ? "That corner looks suspicious."
      : progressRatio >= NEAR_COMPLETE_RATIO
        ? "You're getting close."
        : "Can you recognize the movie?";
  } else if (status === "ready") {
    companionLine = "Can you recognize the movie?";
  }

  return {
    status,
    poolError,
    movie,
    source,
    difficulty,
    tiles,
    size,
    moves,
    elapsedMs,
    hintsRemaining,
    hint,
    companionLine,
    move,
    useHint,
    restart,
    changeDifficulty,
    changeSource,
    newPuzzle,
    loadTodaysPoster,
  };
}
