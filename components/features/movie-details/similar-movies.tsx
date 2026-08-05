"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ScoredMovie } from "@/types/movie";
import { FavoriteButton } from "@/components/features/movies/favorite-button";
import { WatchlistButton } from "@/components/features/movies/watchlist-button";

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/**
 * Like MovieGrid, but shows the recommendation engine's top reason under
 * each card — this is the "explain why" surface the whole product is
 * built around, so it deserves more than a bare match score.
 */
export function SimilarMovies({ recommendations }: { recommendations: ScoredMovie[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {recommendations.map(({ movie, score, reasons }, i) => (
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Link href={`/dashboard/movie/${movie.id}`}>
            <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }} className="group rounded-xl overflow-hidden glass">
              <div className="relative aspect-[2/3] bg-surface">
                {movie.posterPath ? (
                  <Image
                    src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    sizes="(max-width: 768px) 45vw, 200px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-xs px-4 text-center">
                    No poster available
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                  <FavoriteButton movie={movie} />
                  <WatchlistButton movie={movie} />
                </div>
                <div className="absolute top-2 right-2 glass rounded-full px-2 py-1 text-xs font-semibold text-accent">
                  {score}%
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium truncate mb-1">{movie.title}</h3>
                {reasons[0] && (
                  <p className="text-xs text-muted flex items-start gap-1 leading-snug">
                    <Sparkles className="size-3 text-accent shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{reasons[0].label}</span>
                  </p>
                )}
              </div>
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
