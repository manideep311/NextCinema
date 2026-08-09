"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Play, PartyPopper } from "lucide-react";
import type { JourneyProgress } from "@/types/journey";
import { moviePosterLayoutId, POSTER_TRANSITION } from "@/components/motion/movie-poster-transition";

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

interface JourneyHeroProps {
  journeyName: string;
  progress: JourneyProgress;
}

/**
 * The journey's visual anchor — always the actual next unwatched movie
 * (never whatever the user happens to be browsing in the track below), so
 * "Your Next Chapter" stays a stable, trustworthy answer to "what do I
 * watch next." The poster carries the app's signature layoutId shared
 * transition into the movie detail page — this is the one poster on the
 * page that does, deliberately, so it never collides with another
 * instance of the same layoutId mounted elsewhere on this page.
 */
export function JourneyHero({ journeyName, progress }: JourneyHeroProps) {
  const reducedMotion = useReducedMotion();
  const { watchedCount, totalCount, nextMovie } = progress;
  const runtime = nextMovie ? formatRuntime(nextMovie.runtime) : null;
  const blurb = nextMovie?.tagline || nextMovie?.overview || null;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-primary mb-1.5">{journeyName}</p>
      <p className="text-xs text-muted mb-8">
        {watchedCount} / {totalCount} watched
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {nextMovie ? (
          <motion.div
            key={nextMovie.title}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col md:flex-row items-start md:items-center gap-6"
          >
            <motion.div
              layoutId={reducedMotion || !nextMovie.id ? undefined : moviePosterLayoutId(nextMovie.id)}
              transition={POSTER_TRANSITION}
              className="relative w-32 md:w-40 aspect-[2/3] shrink-0 rounded-lg overflow-hidden ring-1 ring-primary/30 shadow-2xl shadow-primary/10"
            >
              {nextMovie.posterPath ? (
                <Image
                  src={`${IMAGE_BASE_URL}/w342${nextMovie.posterPath}`}
                  alt={nextMovie.title}
                  fill
                  sizes="(max-width: 768px) 128px, 160px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-surface flex items-center justify-center text-muted text-xs">
                  No poster
                </div>
              )}
            </motion.div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.15em] text-primary mb-2">Your Next Chapter</p>
              <h1 className="font-serif text-3xl md:text-4xl mb-2 text-balance">{nextMovie.title}</h1>
              <p className="text-sm text-muted mb-4">
                {nextMovie.releaseYear}
                {runtime && ` · ${runtime}`}
              </p>
              {blurb && <p className="text-muted text-sm leading-relaxed max-w-lg mb-5 line-clamp-2">{blurb}</p>}

              <Link
                href={`/dashboard/movie/${nextMovie.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/85 transition-colors"
              >
                <Play className="size-4 fill-current" /> Watch Now
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 glass rounded-xl p-6"
          >
            <div className="size-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <PartyPopper className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-serif text-xl mb-1">Journey complete</h1>
              <p className="text-muted text-sm">
                You&apos;ve watched every movie in {journeyName}.{" "}
                <Link href="/dashboard/journeys" className="text-primary hover:underline">
                  Start another journey
                </Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
