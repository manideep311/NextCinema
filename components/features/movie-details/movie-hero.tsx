"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/features/movies/favorite-button";
import { WatchlistButton } from "@/components/features/movies/watchlist-button";
import type { MovieProfile } from "@/types/movie";

interface MovieHeroProps {
  movie: MovieProfile;
  backdropPath: string | null;
  tagline: string | null;
  runtime: number | null;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function MovieHero({ movie, backdropPath, tagline, runtime }: MovieHeroProps) {
  const actionMovie = {
    id: movie.id,
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseYear: movie.releaseYear,
  };

  return (
    <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8">
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        {backdropPath && (
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={`${IMAGE_BASE_URL}/w1280${backdropPath}`}
              alt=""
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
      </div>

      <div className="relative -mt-24 md:-mt-32 px-4 md:px-8 flex flex-col md:flex-row gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-32 md:w-48 shrink-0 rounded-xl overflow-hidden glass shadow-2xl"
        >
          {movie.posterPath ? (
            <Image
              src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
              alt={movie.title}
              width={342}
              height={513}
              className="w-full h-auto"
            />
          ) : (
            <div className="aspect-[2/3] flex items-center justify-center text-muted text-xs">
              No poster
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            <FavoriteButton movie={actionMovie} />
            <WatchlistButton movie={actionMovie} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 pt-2 md:pt-16"
        >
          <h1 className="font-heading text-2xl md:text-4xl font-bold mb-1">{movie.title}</h1>
          {tagline && <p className="text-muted italic mb-3">{tagline}</p>}

          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-current text-yellow-500" />
              {movie.voteAverage.toFixed(1)}
            </span>
            {movie.releaseYear && <span>{movie.releaseYear}</span>}
            {runtime && (
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {formatRuntime(runtime)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genreNames.map((genre) => (
              <Badge key={genre} variant="secondary" className="glass border-white/10">
                {genre}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
