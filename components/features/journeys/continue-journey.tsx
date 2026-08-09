"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Play, Circle, ArrowRight } from "lucide-react";
import type { ResolvedJourneyMovie, JourneyProgress as JourneyProgressType } from "@/types/journey";
import { JourneyMovieItem } from "@/components/features/journeys/journey-movie-item";
import { JourneyProgress } from "@/components/features/journeys/journey-progress";

const CONTEXT_WINDOW = 4;

/** Trims a full release-order list down to a short, useful window around
 *  "next" — one watched entry for context, the next movie, and a couple
 *  of upcoming ones — instead of showing all 23 in a strip. */
function contextWindow(movies: ResolvedJourneyMovie[]): ResolvedJourneyMovie[] {
  const nextIndex = movies.findIndex((m) => m.state === "next");
  if (nextIndex === -1) return movies.slice(0, CONTEXT_WINDOW);
  const start = Math.max(0, nextIndex - 1);
  return movies.slice(start, start + CONTEXT_WINDOW);
}

interface DashboardContinueJourneyProps {
  journeyId: string;
  journeyName: string;
  movies: ResolvedJourneyMovie[];
  progress: JourneyProgressType;
}

/** Dashboard's "Continue Your Journey" section — a horizontal poster
 *  strip around the user's current position plus a direct link to the
 *  next movie. */
export function DashboardContinueJourney({ journeyId, journeyName, movies, progress }: DashboardContinueJourneyProps) {
  const shown = contextWindow(movies);

  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-primary mb-1">Movie Journey</p>
          <h3 className="font-serif text-xl">{journeyName}</h3>
        </div>
        <JourneyProgress watchedCount={progress.watchedCount} totalCount={progress.totalCount} compact className="w-32 shrink-0 text-right" />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {shown.map((movie) => (
          <JourneyMovieItem key={`${movie.title}-${movie.releaseYear}`} movie={movie} compact />
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted">
          {progress.nextMovie ? (
            <>
              Next: <span className="text-text font-medium">{progress.nextMovie.title}</span>
            </>
          ) : (
            "Journey complete"
          )}
        </p>
        <Link
          href={`/dashboard/journeys/${journeyId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0"
        >
          Continue <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

interface MovieDetailContinueJourneyProps {
  journeyId: string;
  journeyName: string;
  /** A short window (watched context + next + a couple upcoming). */
  movies: ResolvedJourneyMovie[];
  currentMovieId: number;
}

function StateIcon({ state }: { state: ResolvedJourneyMovie["state"] }) {
  if (state === "watched") return <Check className="size-3.5 text-primary shrink-0" />;
  if (state === "next") return <Play className="size-3.5 text-primary fill-current shrink-0" />;
  return <Circle className="size-2 text-muted shrink-0" />;
}

/** Movie detail page's compact "Continue Your Journey" block — a short
 *  text list (not full poster cards, this sits below the hero) with the
 *  current movie highlighted, and a button through to the full timeline. */
export function MovieDetailContinueJourney({ journeyId, journeyName, movies, currentMovieId }: MovieDetailContinueJourneyProps) {
  const reducedMotion = useReducedMotion();
  const shown = contextWindow(movies);

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.3 }}
      className="glass rounded-xl p-5"
    >
      <p className="text-[11px] uppercase tracking-[0.15em] text-primary mb-1">Continue Your Journey</p>
      <h3 className="font-serif text-lg mb-4">{journeyName}</h3>

      <ol className="space-y-2.5 mb-5">
        {shown.map((movie) => {
          const isCurrent = movie.id === currentMovieId;
          return (
            <li
              key={`${movie.title}-${movie.releaseYear}`}
              className={`flex items-center gap-2.5 text-sm rounded-md px-2 py-1 -mx-2 ${
                isCurrent ? "bg-primary/10 text-text" : movie.state === "watched" ? "text-muted" : "text-text"
              }`}
            >
              <StateIcon state={movie.state} />
              <span className={`truncate ${isCurrent ? "font-medium" : ""}`}>{movie.title}</span>
              {isCurrent && <span className="text-[10px] text-primary uppercase tracking-wide ml-auto shrink-0">You&apos;re here</span>}
            </li>
          );
        })}
      </ol>

      <Link
        href={`/dashboard/journeys/${journeyId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Continue Journey <ArrowRight className="size-3.5" />
      </Link>
    </motion.div>
  );
}
