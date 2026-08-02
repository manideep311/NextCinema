"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingMovieCard } from "@/components/features/landing/floating-movie-card";
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
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
      {/* Animated gradient glow behind everything */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(124,58,237,0.25), transparent 60%), radial-gradient(circle at 80% 70%, rgba(6,182,212,0.15), transparent 50%)",
        }}
      />

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
          Find your next
          <br />
          <span className="gradient-text">favorite movie</span>
        </h1>

        <p className="text-muted text-lg mb-8 max-w-lg mx-auto">
          CineMatch AI learns what you love — genres, cast, mood — and
          explains exactly why each recommendation fits.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 rounded-xl group"
          >
            Start Matching
            <ArrowRight className="size-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl border-white/10">
            See How It Works
          </Button>
        </div>
      </motion.div>
    </section>
  );
}