"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FloatingMovieCard } from "@/components/features/landing/floating-movie-card";
import { AiSearchDemo } from "@/components/features/landing/ai-search-demo";
import type { MovieProfile } from "@/types/movie";

interface HeroProps {
  /** A handful of trending movies to decorate the hero with — passed in
   *  from the server component parent so this client component never
   *  needs to fetch data itself. */
  featuredMovies: Pick<MovieProfile, "id" | "title" | "posterPath">[];
}

const MOOD_PROMPTS = ["Slow and emotional", "Mind-bending thrillers", "Feel-good movies", "Dark and intense"];

// Fixed asymmetric collage layout — deliberately uneven sizes/rotations so
// the posters read as an overlapping stack of physical film posters rather
// than a tidy grid. Purely presentational, not derived from data.
const COLLAGE_LAYOUT = [
  { className: "w-40 lg:w-44 top-0 left-0 z-20", rotate: -5, delay: 0.1 },
  { className: "w-32 lg:w-36 top-4 right-4 z-30", rotate: 4, delay: 0.2 },
  { className: "w-36 lg:w-40 bottom-20 left-20 lg:left-24 z-10", rotate: 6, delay: 0.3 },
  { className: "w-28 lg:w-32 bottom-0 right-16 z-20", rotate: -3, delay: 0.4 },
  { className: "w-24 lg:w-28 top-1/3 left-1/2 -translate-x-1/2 z-0", rotate: 2, delay: 0.5 },
];

export function Hero({ featuredMovies }: HeroProps) {
  const collageRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    // Kept intentionally subtle — a hint of depth, not a visible drift.
    // Disabled entirely under prefers-reduced-motion.
    if (reducedMotion) return;
    const rect = collageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: relX * -5, y: relY * -5 });
  }

  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Faint warm vignette — the only "glow" in the hero, and it's tied to the single accent color, not purple/cyan */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 15% 10%, rgba(198,154,77,0.06), transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-5">
            Find something worth watching
          </p>

          <h1 className="font-serif text-5xl md:text-6xl xl:text-7xl leading-[1.05] mb-6 text-balance">
            Find your
            <br />
            next movie.
          </h1>

          <p className="text-muted text-lg leading-relaxed mb-10 max-w-md">
            Tell us what you&apos;re in the mood for. We&apos;ll find the movies that fit.
          </p>

          <AiSearchDemo />

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="text-xs text-muted mr-1">Try something like</span>
            {MOOD_PROMPTS.map((prompt) => (
              <Link
                key={prompt}
                href="/dashboard/search"
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted hover:text-text hover:border-white/20 transition-colors"
              >
                {prompt}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Desktop asymmetric poster collage */}
        <div
          ref={collageRef}
          onMouseMove={handleMouseMove}
          className="relative hidden lg:block h-[520px]"
        >
          <motion.div
            animate={reducedMotion ? undefined : { x: parallax.x, y: parallax.y }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="absolute inset-0"
          >
            {featuredMovies.slice(0, COLLAGE_LAYOUT.length).map((movie, i) => (
              <FloatingMovieCard
                key={movie.id}
                title={movie.title}
                posterPath={movie.posterPath}
                {...COLLAGE_LAYOUT[i]}
              />
            ))}
          </motion.div>
        </div>

        {/* Mobile/tablet — simplified overlapping strip instead of the full collage */}
        <div className="flex lg:hidden -space-x-10 pl-10 pt-4">
          {featuredMovies.slice(0, 4).map((movie, i) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{ rotate: `${i % 2 === 0 ? -4 : 4}deg`, zIndex: i }}
              className="relative w-24 aspect-[2/3] shrink-0 rounded-lg overflow-hidden ring-1 ring-white/[0.07] shadow-xl bg-surface"
            >
              {movie.posterPath && (
                <Image
                  src={`${process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL}/w342${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}