"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Star, Circle } from "lucide-react";
import type { ResolvedJourneyMovie } from "@/types/journey";
import { JourneyMovieItem } from "@/components/features/journeys/journey-movie-item";
import { staggerContainer, fadeInUp, EASE_OUT } from "@/components/motion/motion-config";

interface JourneyTimelineProps {
  movies: ResolvedJourneyMovie[];
}

function StateMarker({ state }: { state: ResolvedJourneyMovie["state"] }) {
  if (state === "watched") {
    return (
      <div className="size-7 rounded-full bg-primary/15 ring-1 ring-primary/40 flex items-center justify-center shrink-0">
        <Check className="size-3.5 text-primary" />
      </div>
    );
  }
  if (state === "next") {
    return (
      <div className="size-8 rounded-full bg-primary ring-4 ring-primary/20 flex items-center justify-center shrink-0">
        <Star className="size-4 text-primary-foreground fill-current" />
      </div>
    );
  }
  return (
    <div className="size-7 rounded-full bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center shrink-0">
      <Circle className="size-2.5 text-muted" />
    </div>
  );
}

/**
 * The centerpiece of Movie Journeys — a single thin vertical line with a
 * state marker + poster card at each stop. Deliberately a straight
 * vertical composition rather than a generic dashboard list: large
 * posters, dark background, one connecting line down the middle.
 *
 * Entries reveal with a small stagger on mount (not a continuous/looping
 * animation) — only the "next" card gets an ongoing subtle pulse, handled
 * inside JourneyMovieItem.
 */
export function JourneyTimeline({ movies }: JourneyTimelineProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.ol
      variants={reducedMotion ? undefined : staggerContainer(40)}
      initial={reducedMotion ? undefined : "hidden"}
      whileInView={reducedMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-80px" }}
      className="relative flex flex-col items-center"
    >
      {movies.map((movie, i) => (
        <motion.li
          key={`${movie.title}-${movie.releaseYear}`}
          variants={reducedMotion ? undefined : fadeInUp}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="relative flex flex-col items-center w-full max-w-[220px]"
        >
          {i > 0 && <div aria-hidden="true" className="w-px h-8 bg-gradient-to-b from-white/15 to-white/5" />}

          <div className="mb-3">
            <StateMarker state={movie.state} />
          </div>

          <JourneyMovieItem movie={movie} />
        </motion.li>
      ))}
    </motion.ol>
  );
}
