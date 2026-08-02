"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { MovieProfile } from "@/types/movie";

interface MovieCardProps {
  movie: Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;
  /** Optional match score (0-100) — shown only when this card appears in a recommendations context */
  matchScore?: number;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/**
 * The single movie poster card used across dashboard, search, and
 * recommendation pages. One component, one set of hover/loading states —
 * changing "how a movie card looks" anywhere in the app means editing
 * this one file.
 */
export function MovieCard({ movie, matchScore }: MovieCardProps) {
  return (
    <Link href={`/dashboard/movie/${movie.id}`}>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.2 }}
        className="group rounded-xl overflow-hidden glass"
      >
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

          {matchScore !== undefined && (
            <div className="absolute top-2 right-2 glass rounded-full px-2 py-1 text-xs font-semibold text-accent">
              {matchScore}%
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium truncate">{movie.title}</h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted text-xs">{movie.releaseYear ?? "—"}</span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Star className="size-3 fill-current text-yellow-500" />
              {movie.voteAverage.toFixed(1)}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}