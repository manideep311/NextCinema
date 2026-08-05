"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown } from "lucide-react";
import { FloatingMovieCard } from "@/components/features/landing/floating-movie-card";
import { AiSearchDemo } from "@/components/features/landing/ai-search-demo";
import type { MovieProfile } from "@/types/movie";

interface HeroProps {
  /** A handful of trending movies to decorate the hero with — passed in
   *  from the server component parent so this client component never
   *  needs to fetch data itself. */
  featuredMovies: Pick<MovieProfile, "id" | "title" | "posterPath">[];
}

// Fixed positions/timings so the layout is deterministic and doesn't
// jump around on re-render — purely presentational, not derived from data.
const CARD_LAYOUTS = [
  { top: "8%", left: "6%", delay: 0.2, floatDuration: 4, rotate: -6 },
  { top: "15%", left: "82%", delay: 0.4, floatDuration: 5, rotate: 5 },
  { top: "60%", left: "4%", delay: 0.6, floatDuration: 4.5, rotate: 4 },
  { top: "68%", left: "85%", delay: 0.3, floatDuration: 5.5, rotate: -4 },
  { top: "40%", left: "90%", delay: 0.5, floatDuration: 4, rotate: 3 },
];

export function Hero({ featuredMovies }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpotlightPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  const spotlight = `radial-gradient(600px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(124,58,237,0.14), transparent 70%)`;

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-24 pb-12"
    >
      {/* Aurora base layer */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(124,58,237,0.28), transparent 55%), radial-gradient(circle at 85% 75%, rgba(6,182,212,0.18), transparent 50%), radial-gradient(circle at 10% 80%, rgba(59,130,246,0.15), transparent 45%)",
        }}
      />
      {/* Mouse-follow spotlight */}
      <motion.div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: spotlight }} />

      {featuredMovies.slice(0, CARD_LAYOUTS.length).map((movie, i) => (
        <FloatingMovieCard
          key={movie.id}
          title={movie.title}
          posterPath={movie.posterPath}
          {...CARD_LAYOUTS[i]}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative z-10 max-w-2xl text-center"
      >
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-muted mb-6">
          <Sparkles className="size-4 text-accent" />
          AI-powered movie matching
        </div>

        <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-6">
          Discover your next
          <br />
          <span className="gradient-text">favorite movie</span>
        </h1>

        <p className="text-muted text-lg mb-8 max-w-lg mx-auto">
          Every great story begins with a good recommendation. NextCinema
          learns what you love — genres, cast, mood — and explains exactly
          why each pick fits.
        </p>

        <div className="mb-8">
          <AiSearchDemo />
        </div>

        <a href="#ai-preview" className="inline-block text-xs text-muted hover:text-text transition-colors">
          See how it works
        </a>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted"
        aria-hidden="true"
      >
        <ChevronDown className="size-5" />
      </motion.div>
    </section>
  );
}
