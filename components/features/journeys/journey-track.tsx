"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Play } from "lucide-react";
import type { ResolvedJourneyMovie } from "@/types/journey";

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;
const ITEM_WIDTH = 152;

interface JourneyTrackProps {
  movies: ResolvedJourneyMovie[];
  onSelect: (movie: ResolvedJourneyMovie, index: number) => void;
}

/**
 * The centerpiece of Movie Journeys — a horizontally scrollable, snap-to-
 * center track instead of a static vertical list. Movies before/after the
 * viewport's center visually recede (scale/opacity); watched entries carry
 * a gold connector into the next one, so the line itself shows how far
 * you've come. Clicking a poster opens the inspector (see
 * journey-movie-inspector.tsx) rather than navigating immediately — the
 * journey context never gets destroyed by a click.
 *
 * Auto-centers on the journey's "next" movie on mount (see the effect
 * below) — the single most important piece of "continue where you left
 * off" for a returning user.
 */
export function JourneyTrack({ movies, onSelect }: JourneyTrackProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [centeredIndex, setCenteredIndex] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  const dragState = useRef<{ startX: number; startScroll: number; dragging: boolean } | null>(null);

  // Auto-focus the viewport on the next unwatched movie (or the last one,
  // if the whole journey is already watched) the moment the track mounts —
  // "here is where I left off," not "here is movie #1."
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || movies.length === 0) return;

    const targetIndex = movies.findIndex((m) => m.state === "next");
    const index = targetIndex === -1 ? movies.length - 1 : targetIndex;
    const el = itemRefs.current.get(index);
    if (!el) return;

    // Center it without an animated scroll on first paint (a hard jump on
    // load reads as "arriving here," not a motion effect) — the gentle
    // motion is reserved for user-driven interactions afterward.
    const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
    setCenteredIndex(index);
    // Only on mount — deliberately not re-running when `movies` reference
    // changes (e.g. switching watch order), so the user's own scroll
    // position isn't yanked out from under them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks which item is nearest the horizontal center of the scroll
  // container — drives the scale/opacity "focus" effect independent of
  // watched/next/upcoming state (which never changes as you scroll).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (best) setCenteredIndex(best.index);
      },
      { root: container, rootMargin: "0px -50% 0px -50%", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [movies]);

  const registerItem = useCallback((index: number, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(index, el);
    else itemRefs.current.delete(index);
  }, []);

  function scrollToIndex(index: number) {
    const container = scrollRef.current;
    const el = itemRefs.current.get(index);
    if (!container || !el) return;
    const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: reducedMotion ? "auto" : "smooth" });
  }

  // Desktop mouse drag-to-scroll — most desktop mice have no horizontal
  // scroll axis, so without this the track would only be usable via
  // trackpad/touch or a scrollbar drag.
  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === "touch") return; // touch already gets native scroll+snap
    const container = scrollRef.current;
    if (!container) return;
    dragState.current = { startX: e.clientX, startScroll: container.scrollLeft, dragging: false };
    container.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    const container = scrollRef.current;
    if (!drag || !container) return;
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > 4) drag.dragging = true;
    container.scrollLeft = drag.startScroll - delta;
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleItemClick(movie: ResolvedJourneyMovie, index: number) {
    // Swallow the click that ends a drag gesture so dragging past a poster
    // doesn't also "select" it.
    if (dragState.current?.dragging) return;
    scrollToIndex(index);
    onSelect(movie, index);
  }

  return (
    <div
      ref={scrollRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="flex overflow-x-auto snap-x snap-mandatory pb-6 pt-4 -mx-4 px-4 md:-mx-8 md:px-8 cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Journey timeline"
    >
      {movies.map((movie, index) => (
        <TrackItem
          key={`${movie.title}-${movie.releaseYear}`}
          movie={movie}
          index={index}
          isFocused={centeredIndex === index}
          isLast={index === movies.length - 1}
          reducedMotion={Boolean(reducedMotion)}
          registerRef={registerItem}
          onClick={() => handleItemClick(movie, index)}
        />
      ))}
    </div>
  );
}

interface TrackItemProps {
  movie: ResolvedJourneyMovie;
  index: number;
  isFocused: boolean;
  isLast: boolean;
  reducedMotion: boolean;
  registerRef: (index: number, el: HTMLElement | null) => void;
  onClick: () => void;
}

function TrackItem({ movie, index, isFocused, isLast, reducedMotion, registerRef, onClick }: TrackItemProps) {
  const isWatched = movie.state === "watched";
  const isNext = movie.state === "next";

  // Two independent visual dimensions, deliberately not conflated:
  // - scale/opacity: where the viewport is looking right now (scroll focus)
  // - ring/badge/label: what the movie's actual watched state is (data truth)
  const scale = isFocused ? 1 : 0.85;
  const opacity = isFocused ? 1 : isWatched ? 0.55 : 0.7;

  return (
    <div
      ref={(el) => registerRef(index, el)}
      data-index={index}
      className="shrink-0 snap-center select-none"
      style={{ width: ITEM_WIDTH }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={`${movie.title}, ${movie.releaseYear}${isWatched ? ", watched" : isNext ? ", watch next" : ""}`}
        animate={reducedMotion ? undefined : { scale, opacity }}
        initial={false}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <div
          className={`relative aspect-[2/3] rounded-lg overflow-hidden ring-1 ${
            isNext ? "ring-primary/70 shadow-xl shadow-primary/10" : "ring-white/[0.06]"
          }`}
        >
          {movie.posterPath ? (
            <Image
              src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
              alt={movie.title}
              fill
              sizes="152px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface text-muted text-[11px] px-3 text-center">
              Poster unavailable
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

          {isNext && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-semibold tracking-wide px-2 py-0.5">
              <Play className="size-2.5 fill-current" /> NEXT
            </div>
          )}
          {isWatched && (
            <div className="absolute top-2 left-2 size-5 rounded-full bg-black/60 ring-1 ring-primary/50 flex items-center justify-center">
              <Check className="size-3 text-primary" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-2">
            <p className="text-[11px] font-medium text-text leading-snug line-clamp-2">{movie.title}</p>
            <p className="text-[10px] text-muted mt-0.5">{movie.releaseYear}</p>
          </div>
        </div>
      </motion.button>

      {/* Progress line — lives in the same column as the poster so it can
         never drift out of alignment while the track scrolls. Watched
         segments draw in left-to-right on mount, a small stagger that
         reads as "the line advancing" every time the journey loads. */}
      <div className="flex items-center h-4 mt-1.5 pl-1">
        <span
          className={`size-2 rounded-full shrink-0 ${
            isWatched ? "bg-primary" : isNext ? "bg-primary ring-4 ring-primary/25" : "bg-white/15"
          }`}
        />
        {!isLast && (
          <span className="flex-1 h-px mx-1 relative bg-white/10 overflow-hidden">
            {isWatched && (
              <motion.span
                initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: reducedMotion ? 0 : Math.min(index * 0.03, 0.6), ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
                className="absolute inset-0 bg-primary/70"
              />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
