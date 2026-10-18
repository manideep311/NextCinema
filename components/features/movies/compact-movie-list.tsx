"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { MovieProfile } from "@/types/movie";
import { TMDB_IMAGE_BASE_URL } from "@/lib/tmdb-images";

type CardMovie = Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;

/** A dense, poster-thumbnail row list — used anywhere results need to fit
 *  a narrow space (the assistant panel, the command palette) where the
 *  full MovieGrid's poster wall would be too cramped. */
export function CompactMovieList({ movies, onNavigate }: { movies: CardMovie[]; onNavigate?: () => void }) {
  return (
    <div className="space-y-1.5">
      {movies.map((movie) => (
        <Link
          key={movie.id}
          href={`/dashboard/movie/${movie.id}`}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
        >
          <div className="relative w-8 aspect-[2/3] rounded overflow-hidden shrink-0 bg-surface">
            {movie.posterPath ? (
              <Image src={`${TMDB_IMAGE_BASE_URL}/w92${movie.posterPath}`} alt={movie.title} fill className="object-cover" />
            ) : null}
          </div>
          <span className="text-sm truncate flex-1">{movie.title}</span>
          <span className="flex items-center gap-1 text-xs text-muted shrink-0">
            <Star className="size-3 fill-current text-yellow-500" /> {movie.voteAverage.toFixed(1)}
          </span>
        </Link>
      ))}
    </div>
  );
}
