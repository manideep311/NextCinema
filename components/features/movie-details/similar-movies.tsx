"use client";

import { motion } from "framer-motion";
import type { MovieRecommendation } from "@/services/recommendations";
import { MovieCard } from "@/components/features/movies/movie-card";

/**
 * Like MovieGrid, but passes the recommendation engine's top reason into
 * each card — this is the "explain why" surface the whole product is
 * built around, so it deserves more than a bare match score.
 */
export function SimilarMovies({ recommendations }: { recommendations: MovieRecommendation[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {recommendations.map((movie, i) => (
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <MovieCard movie={movie} matchScore={movie.matchScore} reason={movie.reasons[0]?.label} />
        </motion.div>
      ))}
    </div>
  );
}
